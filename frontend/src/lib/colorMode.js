'use client';

import { useEffect, useState } from 'react';

const KEY = 'color-mode'; // 'light' | 'dark' | 'system'

/**
 * Runs before React (inline <script> in the root layout) so the page never flashes
 * the wrong theme.
 */
export const colorModeInitScript = `try{var m=localStorage.getItem('${KEY}');if(m==='light'||m==='dark')document.documentElement.dataset.theme=m}catch(e){}`;

export function applyColorMode(mode) {
  const root = document.documentElement;
  if (mode === 'light' || mode === 'dark') root.dataset.theme = mode;
  else delete root.dataset.theme;
  try {
    if (mode === 'system') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, mode);
  } catch {
    // storage unavailable: the choice just lasts for this visit
  }
  // Let every theme control on the page update (top bar, menus, settings).
  window.dispatchEvent(new CustomEvent(EVENT, { detail: mode }));
}

const EVENT = 'color-mode-change';

function storedMode() {
  try {
    return localStorage.getItem(KEY) || 'system';
  } catch {
    return 'system';
  }
}

/** Light/dark actually in use (resolving "system"), plus a toggle. Stays in sync across components. */
export function useEffectiveColorMode() {
  const [effective, setEffective] = useState('light');

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => {
      const mode = storedMode();
      setEffective(mode === 'system' ? (mq.matches ? 'dark' : 'light') : mode);
    };
    update();
    mq.addEventListener('change', update);
    window.addEventListener(EVENT, update);
    return () => {
      mq.removeEventListener('change', update);
      window.removeEventListener(EVENT, update);
    };
  }, []);

  return [effective, () => applyColorMode(effective === 'dark' ? 'light' : 'dark')];
}

export function useColorMode() {
  const [mode, setMode] = useState('system');

  useEffect(() => {
    const update = () => setMode(storedMode());
    update();
    window.addEventListener(EVENT, update);
    return () => window.removeEventListener(EVENT, update);
  }, []);

  return [
    mode,
    (next) => {
      applyColorMode(next);
      setMode(next);
    },
  ];
}
