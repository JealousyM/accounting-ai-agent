'use client';

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ChatContainer } from '@/components/chat';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      retry: 1,
    },
  },
});

export default function ChatPage() {
  return (
    <ProtectedRoute>
      <QueryClientProvider client={queryClient}>
        <ChatContainer />
      </QueryClientProvider>
    </ProtectedRoute>
  );
}
