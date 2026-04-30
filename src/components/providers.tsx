'use client';

import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { ConfirmProvider } from '@/components/ui/confirm';

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [client] = React.useState(
    () => new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false } } }),
  );
  return (
    <QueryClientProvider client={client}>
      <Toaster>
        <ConfirmProvider>{children}</ConfirmProvider>
      </Toaster>
    </QueryClientProvider>
  );
}
