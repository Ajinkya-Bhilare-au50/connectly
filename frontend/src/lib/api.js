import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const TOKEN_KEY = 'token';
const ACCOUNTS_KEY = 'accounts';

// ---------------------------------------------------------------- storage helpers

function store(kind) {
  if (typeof window === 'undefined') return null;
  try {
    return kind === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

const read = (kind, key) => {
  try {
    return store(kind)?.getItem(key) ?? null;
  } catch {
    return null;
  }
};

const write = (kind, key, value) => {
  try {
    if (value == null) store(kind)?.removeItem(key);
    else store(kind)?.setItem(key, value);
  } catch {
    // storage unavailable (private mode etc.)
  }
};

/**
 * Current session token. "Remember me" sessions live in localStorage (survive restarts);
 * others in sessionStorage (end when the browser closes).
 */
export function getToken() {
  return read('session', TOKEN_KEY) || read('local', TOKEN_KEY);
}

function tokenUserId(token) {
  try {
    const { sub, exp } = jwtDecode(token);
    if (exp && exp * 1000 < Date.now()) return null;
    return sub;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- saved accounts (switch account)

/** Remembered accounts on this device: [{ _id, name, username, avatar, token }]. */
export function getSavedAccounts() {
  try {
    const list = JSON.parse(read('local', ACCOUNTS_KEY) || '[]');
    return list.filter((a) => a && a.token && tokenUserId(a.token));
  } catch {
    return [];
  }
}

function saveAccounts(list) {
  write('local', ACCOUNTS_KEY, list.length ? JSON.stringify(list) : null);
}

function rememberAccount(user, token) {
  const others = getSavedAccounts().filter((a) => a._id !== user._id);
  saveAccounts([{ _id: user._id, name: user.name, username: user.username, avatar: user.avatar, token }, ...others]);
}

/** Keep saved account details (name/avatar) fresh after profile edits. */
export function updateSavedAccount(user) {
  const list = getSavedAccounts();
  if (!list.some((a) => a._id === user._id)) return;
  saveAccounts(list.map((a) => (a._id === user._id ? { ...a, name: user.name, username: user.username, avatar: user.avatar } : a)));
}

function setSession(token, user, remember) {
  write('session', TOKEN_KEY, null);
  write('local', TOKEN_KEY, null);
  if (remember) {
    write('local', TOKEN_KEY, token);
    rememberAccount(user, token);
  } else {
    write('session', TOKEN_KEY, token);
  }
}

/** Ends the current session and forgets this account on this device. */
export function logoutUser() {
  const id = tokenUserId(getToken() || '');
  write('session', TOKEN_KEY, null);
  write('local', TOKEN_KEY, null);
  if (id) saveAccounts(getSavedAccounts().filter((a) => a._id !== id));
}

/** Make a saved account the active one (the page reloads to reset all cached data). */
export function switchAccount(accountId) {
  const account = getSavedAccounts().find((a) => a._id === accountId);
  if (!account) return false;
  write('session', TOKEN_KEY, null);
  write('local', TOKEN_KEY, account.token);
  window.location.assign('/');
  return true;
}

// ---------------------------------------------------------------- HTTP client

const client = axios.create({ baseURL: API_BASE_URL });

client.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// A 401 while logged in means the token expired or the account is gone: sign out.
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && getToken()) {
      logoutUser();
      window.location.href = '/signin';
    }
    return Promise.reject(error);
  }
);

export default client;

/** Human readable message from an API error. */
export function errorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (axios.isCancel?.(error) || error?.name === 'CanceledError') return 'Cancelled.';
  if (error?.code === 'ERR_NETWORK') return "Can't reach the server. Check your connection and try again.";
  return error?.response?.data?.message || error?.message || fallback;
}

// ---------------------------------------------------------------- auth

export async function loadUser() {
  const token = getToken();
  if (!token) return { user: null };

  const userId = tokenUserId(token);
  if (!userId) {
    logoutUser();
    return { user: null };
  }

  const res = await client.get(`/users/${userId}`);
  return res.data;
}

export async function registerUser(userData) {
  const { data } = await client.post('/auth/register', userData);
  setSession(data.token, data.user, true);
  return data;
}

export async function loginUser({ remember = false, ...credentials }) {
  const { data } = await client.post('/auth/login', credentials);
  setSession(data.token, data.user, remember);
  return data;
}

export async function requestPasswordReset(email) {
  const { data } = await client.post('/auth/forgot-password', { email });
  return data;
}

export async function resetPassword(token, password) {
  const { data } = await client.post('/auth/reset-password', { token, password });
  return data;
}
