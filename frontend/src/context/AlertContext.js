'use client';

import { createContext, useCallback, useContext, useMemo, useReducer } from 'react';

const AlertContext = createContext(undefined);

function reducer(state, action) {
  switch (action.type) {
    case 'add':
      return [action.alert, ...state];
    case 'remove':
      return state.filter((alert) => alert.id !== action.id);
    default:
      return state;
  }
}

let nextId = 0;

export function AlertProvider({ children }) {
  const [alerts, dispatch] = useReducer(reducer, []);

  const removeAlert = useCallback((id) => dispatch({ type: 'remove', id }), []);

  const setAlert = useCallback(({ type, msg, time = 3000 }) => {
    const alert = { id: ++nextId, type, msg };
    dispatch({ type: 'add', alert });
    setTimeout(() => dispatch({ type: 'remove', id: alert.id }), time);
  }, []);

  const value = useMemo(() => ({ alerts, setAlert, removeAlert }), [alerts, setAlert, removeAlert]);

  return <AlertContext.Provider value={value}>{children}</AlertContext.Provider>;
}

export function useAlert() {
  const context = useContext(AlertContext);
  if (context === undefined) throw new Error('useAlert must be used within an AlertProvider');
  return context;
}
