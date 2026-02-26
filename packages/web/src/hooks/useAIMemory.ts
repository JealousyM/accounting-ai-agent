'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getMemories,
  getMemorySummary,
  updateMemory,
  deleteMemory,
  clearMemories,
  AIMemoryItem,
  AIMemoryCategory,
  MemorySummary,
} from '@/lib/api/ai-memory';

interface UseAIMemoryReturn {
  memories: AIMemoryItem[];
  summary: MemorySummary | undefined;
  isLoading: boolean;
  isLoadingSummary: boolean;
  error: Error | null;

  // Actions
  pinMemory: (id: string, isPinned: boolean) => void;
  hideMemory: (id: string) => void;
  editMemory: (id: string, value: string) => void;
  removeMemory: (id: string) => void;
  clearAll: (category?: AIMemoryCategory) => void;
  refetch: () => void;

  // Mutation states
  isUpdating: boolean;
  isDeleting: boolean;
  isClearing: boolean;
}

export function useAIMemory(category?: AIMemoryCategory): UseAIMemoryReturn {
  const queryClient = useQueryClient();

  const {
    data: memoriesData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['ai-memories', category ?? 'all'],
    queryFn: () => getMemories({ category, limit: 100 }),
    staleTime: 10 * 1000, // 10 seconds — memories are created asynchronously after chat messages
  });

  const { data: summary, isLoading: isLoadingSummary } = useQuery({
    queryKey: ['ai-memory-summary'],
    queryFn: getMemorySummary,
    staleTime: 30 * 1000,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['ai-memories'] });
    queryClient.invalidateQueries({ queryKey: ['ai-memory-summary'] });
  };

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { value?: string; isPinned?: boolean; isHidden?: boolean } }) =>
      updateMemory(id, data),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteMemory(id),
    onSuccess: invalidate,
  });

  const clearMutation = useMutation({
    mutationFn: (cat?: AIMemoryCategory) => clearMemories(cat),
    onSuccess: invalidate,
  });

  return {
    memories: memoriesData?.items ?? [],
    summary,
    isLoading,
    isLoadingSummary,
    error: error as Error | null,

    pinMemory: (id, isPinned) => updateMutation.mutate({ id, data: { isPinned } }),
    hideMemory: (id) => updateMutation.mutate({ id, data: { isHidden: true } }),
    editMemory: (id, value) => updateMutation.mutate({ id, data: { value } }),
    removeMemory: (id) => deleteMutation.mutate(id),
    clearAll: (cat) => clearMutation.mutate(cat),
    refetch,

    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isClearing: clearMutation.isPending,
  };
}
