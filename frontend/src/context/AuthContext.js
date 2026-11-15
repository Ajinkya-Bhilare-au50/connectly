'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import * as api from '@/lib/api';
import Loading from '@/components/Loading';

const AuthContext = createContext(undefined);

const initialState = { user: null, isAuthenticated: false, isLoading: true };

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [state, setState] = useReducer((s, a) => ({ ...s, ...a }), initialState);

  // The token lives in localStorage, so the session can only be restored in the browser.
  useEffect(() => {
    api
      .loadUser()
      .then(({ user }) => setState({ user, isAuthenticated: !!user, isLoading: false }))
      .catch((err) => {
        console.error(api.errorMessage(err));
        api.logoutUser();
        setState({ ...initialState, isLoading: false });
      });
  }, []);

  const login = useCallback(
    async (userData) => {
      const data = await api.loginUser(userData);
      queryClient.clear(); // may be switching from another account
      setState({ user: data.user, isAuthenticated: !!data.user });
      return data;
    },
    [queryClient]
  );

  const register = useCallback(
    async (userData) => {
      const data = await api.registerUser(userData);
      queryClient.clear();
      setState({ user: data.user, isAuthenticated: !!data.user });
      return data;
    },
    [queryClient]
  );

  /** Ends the session, clears cached private data and goes to the sign-in screen. */
  const logout = useCallback(() => {
    api.logoutUser();
    queryClient.clear();
    setState({ ...initialState, isLoading: false });
    router.replace('/signin');
  }, [queryClient, router]);

  const value = useMemo(() => ({ ...state, login, register, logout }), [state, login, register, logout]);

  if (state.isLoading) return <Loading />;

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
