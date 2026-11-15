'use client';

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import pick from 'lodash/pick';
import client from './api';
import { useAlert } from '@/context/AlertContext';
import { useUser } from '@/context/UserContext';

/** Drop empty values and sort keys so equal filters always produce the same query key. */
function cleanQuery(query) {
  return Object.fromEntries(
    Object.entries(query)
      .filter(([, value]) => Boolean(value))
      .sort((a, b) => a[0].localeCompare(b[0]))
  );
}

const getNextPageParam = ({ page, totalPages }) => (page < totalPages ? page + 1 : undefined);

// ---------------------------------------------------------------- tweets

/** Paginated tweets. Returns the infinite query plus the `queryKey` it uses. */
export function useTweets(query = {}) {
  const filters = cleanQuery(
    pick(query, ['sortBy', 'limit', 'author', 'likes', 'retweets', 'replyTo', 'q', 'hashtag', 'includeReplies', 'hasImage', 'hasMedia'])
  );
  const queryKey = ['tweets', filters];

  const result = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) =>
      client.get('/tweets', { params: { ...filters, page: pageParam } }).then((res) => res.data),
    initialPageParam: 1,
    getNextPageParam,
  });

  return { ...result, queryKey };
}

/** Tweets from the logged-in user and the people they follow. */
export function useFeedTweets() {
  const queryKey = ['tweets', 'feed'];
  const result = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) =>
      client.get('/tweets/feed', { params: { page: pageParam } }).then((res) => res.data),
    initialPageParam: 1,
    getNextPageParam,
  });
  return { ...result, queryKey };
}

export function useTweet(id) {
  return useQuery({
    queryKey: ['tweets', id],
    queryFn: () => client.get(`/tweets/${id}`).then((res) => res.data),
    enabled: !!id,
  });
}

export function useCreateTweet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (newTweet) => client.post('/tweets', newTweet),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tweets'] }),
  });
}

/** Apply `fn` to tweet `tweetId` inside cached data of either shape: `{tweet}` or infinite `{pages}`. */
function mapCachedTweet(old, tweetId, fn) {
  if (!old) return old;
  if (old.tweet) {
    return old.tweet._id === tweetId ? { ...old, tweet: fn(old.tweet) } : old;
  }
  if (old.pages) {
    return {
      ...old,
      pages: old.pages.map((page) => ({
        ...page,
        results: page.results.map((tweet) => (tweet._id === tweetId ? fn(tweet) : tweet)),
      })),
    };
  }
  return old;
}

/** Shared optimistic-update mutation for tweet actions. */
function useOptimisticTweetMutation(queryKey, mutationFn, updateCache) {
  const queryClient = useQueryClient();
  const { setAlert } = useAlert();

  return useMutation({
    mutationFn,
    onMutate: async (tweetId) => {
      await queryClient.cancelQueries({ queryKey, exact: true });
      const previous = queryClient.getQueryData(queryKey);
      queryClient.setQueryData(queryKey, (old) => updateCache(old, tweetId));
      return { previous };
    },
    onError: (_err, _tweetId, context) => {
      setAlert({ type: 'error', msg: 'Something went wrong...' });
      if (context?.previous !== undefined) queryClient.setQueryData(queryKey, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['tweets'] }),
  });
}

/** Add/remove the logged-in user in a tweet's `likes` or `retweets` list (optimistically). */
function useTweetToggle(queryKey, field, add) {
  const user = useUser();
  const path = field === 'likes' ? 'like' : 'retweet';
  return useOptimisticTweetMutation(
    queryKey,
    (tweetId) => (add ? client.post : client.delete)(`/tweets/${path}/${tweetId}`),
    (old, tweetId) =>
      mapCachedTweet(old, tweetId, (t) => ({
        ...t,
        [field]: add ? [...t[field], user._id] : t[field].filter((id) => id !== user._id),
      }))
  );
}

export const useTweetLike = (queryKey) => useTweetToggle(queryKey, 'likes', true);
export const useTweetUnlike = (queryKey) => useTweetToggle(queryKey, 'likes', false);
export const useTweetRetweet = (queryKey) => useTweetToggle(queryKey, 'retweets', true);
export const useTweetUnretweet = (queryKey) => useTweetToggle(queryKey, 'retweets', false);

export function useRemoveTweet(queryKey) {
  return useOptimisticTweetMutation(
    queryKey,
    (tweetId) => client.delete(`/tweets/${tweetId}`),
    (old, tweetId) =>
      old?.pages
        ? {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              results: page.results.filter((tweet) => tweet._id !== tweetId),
            })),
          }
        : old
  );
}

/** "What's happening": most liked/reposted/replied tweets. */
export function useTrending(limit = 5) {
  return useQuery({
    queryKey: ['tweets', 'trending', limit],
    queryFn: () => client.get('/tweets/trending', { params: { limit } }).then((res) => res.data.results),
  });
}

// ---------------------------------------------------------------- bookmarks (private)

export function useBookmarks() {
  const queryKey = ['tweets', 'bookmarks'];
  const result = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) =>
      client.get('/tweets/bookmarks', { params: { page: pageParam } }).then((res) => res.data),
    initialPageParam: 1,
    getNextPageParam,
  });
  return { ...result, queryKey };
}

/** Set of tweet ids the logged-in user has bookmarked. */
export function useBookmarkIds() {
  const user = useUser();
  const { data } = useQuery({
    queryKey: ['bookmarkIds', user?._id],
    queryFn: () => client.get('/tweets/bookmarks/ids').then((res) => res.data.ids),
    enabled: !!user,
    staleTime: 60_000,
  });
  return new Set(data ?? []);
}

/** Add/remove a bookmark with an optimistic update of the id set. */
export function useToggleBookmark() {
  const user = useUser();
  const queryClient = useQueryClient();
  const { setAlert } = useAlert();
  const key = ['bookmarkIds', user?._id];

  return useMutation({
    mutationFn: ({ tweetId, add }) => (add ? client.post : client.delete)(`/tweets/bookmark/${tweetId}`),
    onMutate: async ({ tweetId, add }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData(key);
      queryClient.setQueryData(key, (old = []) => (add ? [...old, tweetId] : old.filter((id) => id !== tweetId)));
      return { previous };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(key, context?.previous);
      setAlert({ type: 'error', msg: 'Something went wrong...' });
    },
    onSuccess: (_data, { add }) => setAlert({ type: 'success', msg: add ? 'Added to your Bookmarks' : 'Removed from your Bookmarks' }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key });
      queryClient.invalidateQueries({ queryKey: ['tweets', 'bookmarks'] });
    },
  });
}

// ---------------------------------------------------------------- profiles

export function useProfiles(query = {}) {
  const filters = cleanQuery(pick(query, ['sortBy', 'limit', 'following', 'followers', 'likes', 'retweets', 'q']));

  return useInfiniteQuery({
    queryKey: ['profiles', filters],
    queryFn: ({ pageParam }) =>
      client.get('/profiles', { params: { ...filters, page: pageParam } }).then((res) => res.data),
    initialPageParam: 1,
    getNextPageParam,
  });
}

export function useProfile(userId) {
  return useQuery({
    queryKey: ['profiles', userId],
    queryFn: () => client.get(`/profiles/${userId}`).then((res) => res.data.profile),
    enabled: !!userId,
  });
}

function useFollowMutation(method, updateFollowers) {
  const queryClient = useQueryClient();
  const user = useUser();
  const { setAlert } = useAlert();

  return useMutation({
    mutationFn: (userId) => client[method](`/profiles/follow/${userId}`),
    onMutate: async (userId) => {
      const key = ['profiles', userId];
      await queryClient.cancelQueries({ queryKey: key, exact: true });
      const previous = queryClient.getQueryData(key);
      queryClient.setQueryData(key, (old) =>
        old ? { ...old, followers: updateFollowers(old.followers, user._id) } : old
      );
      return { previous };
    },
    onError: (_err, userId, context) => {
      setAlert({ type: 'error', msg: 'Something went wrong...' });
      queryClient.setQueryData(['profiles', userId], context?.previous);
    },
    onSettled: () => {
      // Follower/following lists and the feed change too.
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      queryClient.invalidateQueries({ queryKey: ['tweets', 'feed'] });
    },
  });
}

export function useProfileFollowMutation() {
  return useFollowMutation('post', (followers, me) => [...followers, me]);
}

export function useProfileUnfollowMutation() {
  return useFollowMutation('delete', (followers, me) => followers.filter((id) => id !== me));
}

// ---------------------------------------------------------------- trends, polls, edits

/** "Trends for you": most used hashtags. */
export function useTrends(limit = 5) {
  return useQuery({
    queryKey: ['trends', limit],
    queryFn: () => client.get('/tweets/trends', { params: { limit } }).then((res) => res.data.results),
    staleTime: 60_000,
  });
}

/** Vote in a poll; the cached tweet is replaced with the server's updated version. */
export function useVote(queryKey) {
  const queryClient = useQueryClient();
  const { setAlert } = useAlert();
  return useMutation({
    mutationFn: ({ tweetId, option }) =>
      client.post(`/tweets/${tweetId}/vote`, { option }).then((res) => res.data.tweet),
    onSuccess: (tweet) => {
      if (queryKey) queryClient.setQueryData(queryKey, (old) => mapCachedTweet(old, tweet._id, () => tweet));
      queryClient.invalidateQueries({ queryKey: ['tweets'] });
    },
    onError: (err) => setAlert({ type: 'error', msg: err?.response?.data?.message || 'Your vote was not saved.' }),
  });
}

export function useEditTweet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tweetId, text }) => client.patch(`/tweets/${tweetId}`, { text }).then((res) => res.data.tweet),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tweets'] }),
  });
}

export function useProfileByUsername(username) {
  return useQuery({
    queryKey: ['profiles', 'by-username', username],
    queryFn: () => client.get(`/profiles/by-username/${encodeURIComponent(username)}`).then((res) => res.data.profile),
    enabled: !!username,
  });
}

// ---------------------------------------------------------------- notifications

export function useUnreadNotificationCount() {
  const user = useUser();
  return useQuery({
    queryKey: ['notifications', 'unread', user?._id],
    queryFn: () => client.get('/notifications/unread-count').then((res) => res.data.count),
    enabled: !!user,
    refetchInterval: 30_000,
  });
}

export function useNotifications(type) {
  const queryKey = ['notifications', 'list', type || 'all'];
  const result = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) =>
      client.get('/notifications', { params: { page: pageParam, ...(type ? { type } : {}) } }).then((res) => res.data),
    initialPageParam: 1,
    getNextPageParam,
  });
  return { ...result, queryKey };
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => client.post('/notifications/read-all'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => client.post(`/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

// ---------------------------------------------------------------- messages

export function useConversations() {
  const user = useUser();
  return useQuery({
    queryKey: ['conversations', 'list', user?._id],
    queryFn: () => client.get('/conversations').then((res) => res.data.results),
    enabled: !!user,
    refetchInterval: 10_000,
  });
}

export function useUnreadMessageCount() {
  const user = useUser();
  return useQuery({
    queryKey: ['conversations', 'unread', user?._id],
    queryFn: () => client.get('/conversations/unread-count').then((res) => res.data.count),
    enabled: !!user,
    refetchInterval: 15_000,
  });
}

export function useConversation(id) {
  return useQuery({
    queryKey: ['conversations', 'one', id],
    queryFn: () => client.get(`/conversations/${id}`).then((res) => res.data.conversation),
    enabled: !!id,
  });
}

/** Open (or reuse) a conversation with someone. Resolves to the conversation. */
export function useStartConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId) => client.post('/conversations', { userId }).then((res) => res.data.conversation),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['conversations', 'list'] }),
  });
}

// ---------------------------------------------------------------- lists

export function useMyLists() {
  const user = useUser();
  return useQuery({
    queryKey: ['lists', 'mine', user?._id],
    queryFn: () => client.get('/lists').then((res) => res.data.results),
    enabled: !!user,
  });
}

export function useList(id) {
  return useQuery({
    queryKey: ['lists', 'one', id],
    queryFn: () => client.get(`/lists/${id}`).then((res) => res.data.list),
    enabled: !!id,
  });
}

export function useListMembers(id) {
  return useQuery({
    queryKey: ['lists', 'members', id],
    queryFn: () => client.get(`/lists/${id}/members`).then((res) => res.data.results),
    enabled: !!id,
  });
}

export function useListTweets(id) {
  const queryKey = ['tweets', 'list', id];
  const result = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => client.get(`/lists/${id}/tweets`, { params: { page: pageParam } }).then((res) => res.data),
    initialPageParam: 1,
    getNextPageParam,
    enabled: !!id,
  });
  return { ...result, queryKey };
}

function useListMutation(fn) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      queryClient.invalidateQueries({ queryKey: ['tweets', 'list'] });
    },
  });
}

export const useCreateList = () => useListMutation((data) => client.post('/lists', data).then((res) => res.data.list));
export const useUpdateList = () =>
  useListMutation(({ id, ...data }) => client.patch(`/lists/${id}`, data).then((res) => res.data.list));
export const useDeleteList = () => useListMutation((id) => client.delete(`/lists/${id}`));
export const useListMember = () =>
  useListMutation(({ listId, userId, add }) =>
    (add ? client.post : client.delete)(`/lists/${listId}/members/${userId}`).then((res) => res.data.list)
  );
