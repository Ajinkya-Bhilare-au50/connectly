import { Inter } from 'next/font/google';
import StyledComponentsRegistry from '@/lib/registry';
import { colorModeInitScript } from '@/lib/colorMode';
import Providers from './providers';

// Self-hosted at build time by Next.js (no runtime request to Google).
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

export const metadata = {
  title: { default: 'Connectly', template: '%s · Connectly' },
  description: 'Connectly — share ideas, moments, and what matters to you.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F8FAFC' },
    { media: '(prefers-color-scheme: dark)', color: '#0B1120' },
  ],
};

// `modal` is the @modal parallel route: posts and the composer open there as dialogs.
export default function RootLayout({ children, modal }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: colorModeInitScript }} />
      </head>
      <body>
        <StyledComponentsRegistry>
          <Providers modal={modal}>{children}</Providers>
        </StyledComponentsRegistry>
      </body>
    </html>
  );
}
