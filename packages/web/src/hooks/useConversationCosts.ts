'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchConversationDetail, fetchConversationRuns } from '@/lib/api/ai-costs';
import { ConversationCostDetail } from '@/types/ai-costs.types';

interface UseConversationCostsReturn {
  // Data
  detail: ConversationCostDetail | undefined;
  conversation: ConversationCostDetail['conversation'] | undefined;
  dailyData: ConversationCostDetail['dailyData'];
  byModel: ConversationCostDetail['byModel'];
  runs: ConversationCostDetail['runs'];

  // Loading/Error states
  isLoading: boolean;
  isError: boolean;
  error: Error | null;

  // Actions
  refetch: () => void;
}

export function useConversationCosts(conversationId: string | null): UseConversationCostsReturn {
  const {
    data: detail,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['ai-costs-conversation', conversationId],
    queryFn: () => fetchConversationDetail(conversationId!),
    enabled: !!conversationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });

  return {
    // Data
    detail,
    conversation: detail?.conversation,
    dailyData: detail?.dailyData || [],
    byModel: detail?.byModel || [],
    runs: detail?.runs || [],

    // Loading/Error states
    isLoading,
    isError,
    error: error as Error | null,

    // Actions
    refetch,
  };
}

// Separate hook for just runs (if needed for pagination/infinite scroll)
export function useConversationRuns(conversationId: string | null) {
  const {
    data: runs,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['ai-costs-conversation-runs', conversationId],
    queryFn: () => fetchConversationRuns(conversationId!),
    enabled: !!conversationId,
    staleTime: 5 * 60 * 1000,
  });

  return {
    runs: runs || [],
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
  };
}
