'use client';

import Link from 'next/link';
import { Button, CenteredRow, EmptyState } from '@/components/ui';

export default function NotFound() {
  return (
    <>
      <EmptyState title="This page doesn't exist">Try going back home and starting from there.</EmptyState>
      <CenteredRow>
        <Button as={Link} href="/" $variant="primary">
          Go home
        </Button>
      </CenteredRow>
    </>
  );
}
