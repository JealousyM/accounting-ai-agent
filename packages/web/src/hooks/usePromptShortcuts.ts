'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getShortcuts,
  createShortcut,
  updateShortcut,
  deleteShortcut,
  reorderShortcuts,
  PromptShortcut,
} from '@/lib/api/prompt-shortcuts';

const QUERY_KEY = ['prompt-shortcuts'];
const FREE_PLAN_LIMIT = 20;

interface UsePromptShortcutsReturn {
  shortcuts: PromptShortcut[];
  isLoading: boolean;
  isAtLimit: boolean;
  limitCount: number;

  addShortcut: (label: string, prompt: string) => Promise<void>;
  editShortcut: (id: string, label: string, prompt: string) => void;
  removeShortcut: (id: string) => void;
  reorder: (ids: string[]) => void;

  isAdding: boolean;
  isLimitError: boolean;
}

export function usePromptShortcuts(): UsePromptShortcutsReturn {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: getShortcuts,
    staleTime: 30 * 1000,
  });

  const shortcuts = data ?? [];
  const invalidate = () => queryClient.invalidateQueries({ queryKey: QUERY_KEY });

  const createMutation = useMutation({
    mutationFn: ({ label, prompt }: { label: string; prompt: string }) =>
      createShortcut({ label, prompt }),
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, label, prompt }: { id: string; label: string; prompt: string }) =>
      updateShortcut(id, { label, prompt }),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteShortcut(id),
    onSuccess: invalidate,
  });

  const reorderMutation = useMutation({
    mutationFn: (ids: string[]) => reorderShortcuts(ids),
    onSuccess: invalidate,
  });

  const isLimitError =
    createMutation.isError &&
    (createMutation.error as any)?.message?.includes('SHORTCUT_LIMIT_REACHED');

  return {
    shortcuts,
    isLoading,
    isAtLimit: shortcuts.length >= FREE_PLAN_LIMIT,
    limitCount: FREE_PLAN_LIMIT,

    addShortcut: async (label, prompt) => {
      await createMutation.mutateAsync({ label, prompt });
    },
    editShortcut: (id, label, prompt) => updateMutation.mutate({ id, label, prompt }),
    removeShortcut: (id) => deleteMutation.mutate(id),
    reorder: (ids) => reorderMutation.mutate(ids),

    isAdding: createMutation.isPending,
    isLimitError,
  };
}
