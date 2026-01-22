'use client';

import React from 'react';
import { ChatContainer } from '@/components/chat';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

export default function ChatPage() {
  return (
    <ProtectedRoute>
      <ChatContainer />
    </ProtectedRoute>
  );
}
