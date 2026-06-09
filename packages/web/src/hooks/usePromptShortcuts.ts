'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import {
  getShortcuts,
  createShortcut,
  updateShortcut,
  deleteShortcut,
  reorderShortcuts,
  PromptShortcut,
} from '@/lib/api/prompt-shortcuts';
import {
  getOrgShortcuts,
  createOrgShortcut,
  updateOrgShortcut,
  deleteOrgShortcut,
  OrgPromptShortcut,
} from '@/lib/api/org-prompt-shortcuts';

const PERSONAL_QUERY_KEY = ['prompt-shortcuts'];
const ORG_QUERY_KEY = ['org-prompt-shortcuts'];
const FREE_PLAN_LIMIT = 20;
const ORG_SHORTCUT_LIMIT = 20;

export type CombinedShortcut = (PromptShortcut | OrgPromptShortcut) & { source: 'personal' | 'org' };

interface UsePromptShortcutsReturn {
  shortcuts: CombinedShortcut[];
  isLoading: boolean;
  isAtLimit: boolean;
  limitCount: number;
  isOrgAdmin: boolean;
  isOrgAtLimit: boolean;

  addShortcut: (label: string, prompt: string) => Promise<void>;
  editShortcut: (id: string, label: string, prompt: string) => void;
  removeShortcut: (id: string) => void;
  reorder: (ids: string[]) => void;

  addOrgShortcut: (label: string, prompt: string) => Promise<void>;
  editOrgShortcut: (id: string, label: string, prompt: string) => void;
  removeOrgShortcut: (id: string) => void;

  isAdding: boolean;
  isAddingOrg: boolean;
  isLimitError: boolean;
}

export function usePromptShortcuts(): UsePromptShortcutsReturn {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isOrgAdmin = user?.orgRole === 'admin' && user?.orgMembershipStatus === 'active';
  const hasOrg = !!(user?.organizationId && user?.orgMembershipStatus === 'active');

  const { data: personalData, isLoading: isPersonalLoading } = useQuery({
    queryKey: PERSONAL_QUERY_KEY,
    queryFn: getShortcuts,
    staleTime: 30 * 1000,
  });

  const { data: orgData, isLoading: isOrgLoading } = useQuery({
    queryKey: ORG_QUERY_KEY,
    queryFn: getOrgShortcuts,
    staleTime: 30 * 1000,
    enabled: hasOrg,
  });

  const personalShortcuts = personalData ?? [];
  const orgShortcuts = orgData ?? [];

  const combined: CombinedShortcut[] = [
    ...orgShortcuts.map((s) => ({ ...s, source: 'org' as const })),
    ...personalShortcuts.map((s) => ({ ...s, source: 'personal' as const })),
  ];

  const invalidatePersonal = () => queryClient.invalidateQueries({ queryKey: PERSONAL_QUERY_KEY });
  const invalidateOrg = () => queryClient.invalidateQueries({ queryKey: ORG_QUERY_KEY });

  // Personal mutations
  const createMutation = useMutation({
    mutationFn: ({ label, prompt }: { label: string; prompt: string }) =>
      createShortcut({ label, prompt }),
    onSuccess: invalidatePersonal,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, label, prompt }: { id: string; label: string; prompt: string }) =>
      updateShortcut(id, { label, prompt }),
    onSuccess: invalidatePersonal,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteShortcut(id),
    onSuccess: invalidatePersonal,
  });

  const reorderMutation = useMutation({
    mutationFn: (ids: string[]) => reorderShortcuts(ids),
    onSuccess: invalidatePersonal,
  });

  // Org mutations
  const createOrgMutation = useMutation({
    mutationFn: ({ label, prompt }: { label: string; prompt: string }) =>
      createOrgShortcut({ label, prompt }),
    onSuccess: invalidateOrg,
  });

  const updateOrgMutation = useMutation({
    mutationFn: ({ id, label, prompt }: { id: string; label: string; prompt: string }) =>
      updateOrgShortcut(id, { label, prompt }),
    onSuccess: invalidateOrg,
  });

  const deleteOrgMutation = useMutation({
    mutationFn: (id: string) => deleteOrgShortcut(id),
    onSuccess: invalidateOrg,
  });

  const isLimitError =
    createMutation.isError &&
    (createMutation.error as Error)?.message?.includes('SHORTCUT_LIMIT_REACHED');

  return {
    shortcuts: combined,
    isLoading: isPersonalLoading || (hasOrg && isOrgLoading),
    isAtLimit: personalShortcuts.length >= FREE_PLAN_LIMIT,
    limitCount: FREE_PLAN_LIMIT,
    isOrgAdmin: !!isOrgAdmin,
    isOrgAtLimit: orgShortcuts.length >= ORG_SHORTCUT_LIMIT,

    addShortcut: async (label, prompt) => {
      await createMutation.mutateAsync({ label, prompt });
    },
    editShortcut: (id, label, prompt) => updateMutation.mutate({ id, label, prompt }),
    removeShortcut: (id) => deleteMutation.mutate(id),
    reorder: (ids) => reorderMutation.mutate(ids),

    addOrgShortcut: async (label, prompt) => {
      await createOrgMutation.mutateAsync({ label, prompt });
    },
    editOrgShortcut: (id, label, prompt) => updateOrgMutation.mutate({ id, label, prompt }),
    removeOrgShortcut: (id) => deleteOrgMutation.mutate(id),

    isAdding: createMutation.isPending,
    isAddingOrg: createOrgMutation.isPending,
    isLimitError,
  };
}
