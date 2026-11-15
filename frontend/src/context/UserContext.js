'use client';

import { createContext, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import client from '@/lib/api';
import { useAuth } from './AuthContext';
import Loading from '@/components/Loading';
import DisplayError from '@/components/DisplayError';

const UserContext = createContext(undefined);

/** Provides the logged-in user (kept fresh through react-query), or null. */
export function UserProvider({ children }) {
  const { user } = useAuth();
  const userId = user?._id;

  const { isLoading, data, error } = useQuery({
    queryKey: ['users', userId],
    queryFn: () => client.get(`/users/${userId}`).then((res) => res.data),
    enabled: !!userId,
    initialData: user ? { user } : undefined,
  });

  if (error) return <DisplayError error={error} />;
  if (isLoading) return <Loading />;

  return <UserContext.Provider value={userId ? data?.user ?? null : null}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) throw new Error('useUser must be used within a UserProvider');
  return context;
}
