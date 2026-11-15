import { format } from 'date-fns';

/** Short relative time like on social apps: "now", "5m", "3h", "Apr 22", "Apr 22, 2021". */
export function shortTime(value) {
  const date = new Date(value);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return date.getFullYear() === new Date().getFullYear() ? format(date, 'MMM d') : format(date, 'MMM d, yyyy');
}

/** Full timestamp: "9:21 PM · Nov 15, 2026" */
export function fullTime(value) {
  return format(new Date(value), "h:mm a '·' MMM d, yyyy");
}

/** 1234 -> "1.2K" */
export function compactNumber(n) {
  return n ? new Intl.NumberFormat('en', { notation: 'compact' }).format(n) : '';
}
