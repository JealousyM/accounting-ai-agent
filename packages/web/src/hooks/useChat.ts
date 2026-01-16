'use client';

import { useState, useCallback, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// ============================================
// TYPES
// ============================================

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: string;
  toolCalls?: {
    id: string;
    name: string;
    arguments: string;
  }[];
  metadata?: {
    model?: string;
    provider?: string;
    tokens?: {
      prompt: number;
      completion: number;
    };
  };
}

export interface Conversation {
  id: string;
  title: string;
  topic?: string;
  lastMessage?: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationDetail {
  id: string;
  userId: string;
  title: string;
  topic?: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

// ============================================
// API FUNCTIONS
// ============================================

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    Authorization: `Bearer ${token}`,
  };
};

const fetchConversations = async (): Promise<Conversation[]> => {
  const response = await axios.get(`${API_URL}/api/ai/conversations`, {
    headers: getAuthHeaders(),
  });
  return response.data.data;
};

const fetchConversation = async (id: string): Promise<ConversationDetail> => {
  const response = await axios.get(`${API_URL}/api/ai/conversations/${id}`, {
    headers: getAuthHeaders(),
  });
  return response.data.data;
};

const createConversation = async (title?: string): Promise<{ id: string; title: string }> => {
  const response = await axios.post(
    `${API_URL}/api/ai/conversations`,
    { title },
    { headers: getAuthHeaders() }
  );
  return response.data.data;
};

const sendMessage = async (
  conversationId: string,
  content: string,
  provider?: 'openai' | 'anthropic'
): Promise<{
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
  toolsUsed?: string[];
}> => {
  const response = await axios.post(
    `${API_URL}/api/ai/conversations/${conversationId}/messages`,
    { content, provider },
    { headers: getAuthHeaders() }
  );
  return response.data.data;
};

const deleteConversation = async (id: string): Promise<void> => {
  await axios.delete(`${API_URL}/api/ai/conversations/${id}`, {
    headers: getAuthHeaders(),
  });
};

// ============================================
// HOOK
// ============================================

export function useChat() {
  const queryClient = useQueryClient();
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);

  // Fetch conversations list
  const {
    data: conversations = [],
    isLoading: isLoadingConversations,
    refetch: refetchConversations,
  } = useQuery({
    queryKey: ['conversations'],
    queryFn: fetchConversations,
  });

  // Fetch current conversation details
  const {
    data: currentConversation,
    isLoading: isLoadingConversation,
  } = useQuery({
    queryKey: ['conversation', currentConversationId],
    queryFn: () => fetchConversation(currentConversationId!),
    enabled: !!currentConversationId,
  });

  // Create conversation mutation
  const createConversationMutation = useMutation({
    mutationFn: (title?: string) => createConversation(title),
    onSuccess: (data) => {
      setCurrentConversationId(data.id);
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: ({
      conversationId,
      content,
      provider,
    }: {
      conversationId: string;
      content: string;
      provider?: 'openai' | 'anthropic';
    }) => sendMessage(conversationId, content, provider),
    onMutate: async ({ content }) => {
      // Optimistic update: show user message immediately
      setPendingMessage(content);
    },
    onSuccess: () => {
      setPendingMessage(null);
      // Refetch conversation to get updated messages
      queryClient.invalidateQueries({ queryKey: ['conversation', currentConversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: () => {
      setPendingMessage(null);
    },
  });

  // Delete conversation mutation
  const deleteConversationMutation = useMutation({
    mutationFn: deleteConversation,
    onSuccess: (_, deletedId) => {
      if (currentConversationId === deletedId) {
        setCurrentConversationId(null);
      }
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  // Auto-select first conversation or create new one
  useEffect(() => {
    if (!currentConversationId && conversations.length > 0 && !isLoadingConversations) {
      setCurrentConversationId(conversations[0].id);
    }
  }, [conversations, currentConversationId, isLoadingConversations]);

  // Send message handler
  const handleSendMessage = useCallback(
    async (content: string, provider?: 'openai' | 'anthropic') => {
      if (!content.trim()) return;

      // If no conversation, create one first
      if (!currentConversationId) {
        const newConv = await createConversationMutation.mutateAsync(undefined);
        sendMessageMutation.mutate({
          conversationId: newConv.id,
          content,
          provider,
        });
      } else {
        sendMessageMutation.mutate({
          conversationId: currentConversationId,
          content,
          provider,
        });
      }
    },
    [currentConversationId, createConversationMutation, sendMessageMutation]
  );

  // Create new conversation handler
  const handleCreateConversation = useCallback(async () => {
    await createConversationMutation.mutateAsync(undefined);
  }, [createConversationMutation]);

  // Select conversation handler
  const handleSelectConversation = useCallback((id: string) => {
    setCurrentConversationId(id);
  }, []);

  // Delete conversation handler
  const handleDeleteConversation = useCallback(
    async (id: string) => {
      await deleteConversationMutation.mutateAsync(id);
    },
    [deleteConversationMutation]
  );

  // Get messages with pending message
  const messages = currentConversation?.messages || [];
  const allMessages = pendingMessage
    ? [
        ...messages,
        {
          id: 'pending-user',
          role: 'user' as const,
          content: pendingMessage,
          timestamp: new Date().toISOString(),
        },
      ]
    : messages;

  return {
    // State
    conversations,
    currentConversation,
    currentConversationId,
    messages: allMessages,

    // Loading states
    isLoading: sendMessageMutation.isPending,
    isLoadingConversations,
    isLoadingConversation,
    isCreatingConversation: createConversationMutation.isPending,

    // Error states
    error: sendMessageMutation.error,

    // Actions
    sendMessage: handleSendMessage,
    createConversation: handleCreateConversation,
    selectConversation: handleSelectConversation,
    deleteConversation: handleDeleteConversation,
    refetchConversations,
  };
}
