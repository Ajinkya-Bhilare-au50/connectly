'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ThemeProvider } from 'styled-components';
import { ContentRow, GlobalStyle, MainArea, MainColumn, Shell, theme } from '@/lib/theme';
import { AuthProvider } from '@/context/AuthContext';
import { UserProvider } from '@/context/UserContext';
import { AlertProvider } from '@/context/AlertContext';
import { MobileNav, Sidebar } from '@/components/Navigation';
import TopBar from '@/components/TopBar';
import RightRail from '@/components/RightRail';
import Alerts from '@/components/Alerts';
import { PageTitleSlotContext } from '@/components/ui';

// Pages with their own full-screen layout (no sidebar / top bar).
const BARE_ROUTES = ['/signin', '/signup', '/forgot-password', '/reset-password'];
// Pages that use the full width (no right panel).
const WIDE_ROUTES = ['/messages'];

function AppShell({ children, modal }) {
  const pathname = usePathname();
  const [titleSlot, setTitleSlot] = useState(null);

  if (BARE_ROUTES.includes(pathname)) {
    return (
      <>
        {children}
        <Alerts />
      </>
    );
  }

  const wide = WIDE_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`));

  return (
    <PageTitleSlotContext.Provider value={titleSlot}>
      <a href="#main" className="sr-only">
        Skip to content
      </a>
      <Shell>
        <Sidebar />
        <MainArea>
          <TopBar slotRef={setTitleSlot} />
          <ContentRow>
            <MainColumn id="main" $wide={wide}>
              {children}
            </MainColumn>
            {!wide && <RightRail />}
          </ContentRow>
        </MainArea>
      </Shell>
      <MobileNav />
      {modal}
      <Alerts />
    </PageTitleSlotContext.Provider>
  );
}

export default function Providers({ children, modal }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 15_000,
            // Don't retry 4xx errors (not found, forbidden...) - they won't fix themselves.
            retry: (count, error) => count < 3 && !(error?.response?.status < 500),
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <GlobalStyle />
        <AuthProvider>
          <UserProvider>
            <AlertProvider>
              <AppShell modal={modal}>{children}</AppShell>
            </AlertProvider>
          </UserProvider>
        </AuthProvider>
      </ThemeProvider>
      <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
    </QueryClientProvider>
  );
}
