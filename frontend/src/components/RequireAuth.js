'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useUser } from '@/context/UserContext';
import Loading from './Loading';

/** Renders children only for logged-in users; otherwise sends them to /signin and back afterwards. */
export default function RequireAuth({ children }) {
  const user = useUser();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!user) router.replace(`/signin?from=${encodeURIComponent(pathname)}`);
  }, [user, router, pathname]);

  if (!user) return <Loading />;
  return children;
}
