'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getKSeFInvoices,
  getKSeFStatistics,
  getKSeFConfig,
  getKSeFStatus,
  sendInvoiceToKSeF,
  bulkSendToKSeF,
  updateKSeFConfig,
  downloadKSeFUPO,
  downloadKSeFInvoice,
  getKSeFContractors,
  createKSeFContractor,
  updateKSeFContractor,
  deleteKSeFContractor,
  syncKSeFContractors,
  CreateKSeFContractorPayload,
  KSeFContractor,
  KSeFInvoiceListItem,
  KSeFStatistics,
  KSeFConfig,
  KSeFStatusInfo,
  KSeFSendResult,
  KSeFBulkSendResult,
  KSeFInvoicesQuery,
  KSeFAdapterType,
} from '@/lib/api/ksef';

interface UseKSeFReturn {
  // Data
  invoices: KSeFInvoiceListItem[] | undefined;
  statistics: KSeFStatistics | undefined;
  config: KSeFConfig | undefined;

  // Loading
  isLoadingInvoices: boolean;
  isLoadingStatistics: boolean;
  isLoadingConfig: boolean;
  isSending: boolean;

  // Errors
  invoicesError: Error | null;
  statisticsError: Error | null;

  // Actions
  sendInvoice: (invoiceId: string, adapter?: KSeFAdapterType) => void;
  bulkSend: (invoiceIds: string[], continueOnError?: boolean) => void;
  checkStatus: (referenceNumber: string) => Promise<KSeFStatusInfo>;
  downloadUPO: (referenceNumber: string) => Promise<Blob>;
  downloadInvoice: (referenceNumber: string, format?: 'pdf' | 'xml') => Promise<Blob>;
  updateConfig: (updates: Partial<KSeFConfig>) => void;
  refetchInvoices: () => void;
  refetchStatistics: () => void;

  // Mutation results
  lastSendResult: KSeFSendResult | undefined;
  lastBulkResult: KSeFBulkSendResult | undefined;
}

export function useKSeF(query?: KSeFInvoicesQuery): UseKSeFReturn {
  const queryClient = useQueryClient();

  // Fetch invoices
  const {
    data: invoices,
    isLoading: isLoadingInvoices,
    error: invoicesError,
    refetch: refetchInvoices,
  } = useQuery({
    queryKey: ['ksef-invoices', query],
    queryFn: () => getKSeFInvoices(query),
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 2,
  });

  // Fetch statistics
  const {
    data: statistics,
    isLoading: isLoadingStatistics,
    error: statisticsError,
    refetch: refetchStatistics,
  } = useQuery({
    queryKey: ['ksef-statistics'],
    queryFn: getKSeFStatistics,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });

  // Fetch config
  const { data: config, isLoading: isLoadingConfig } = useQuery({
    queryKey: ['ksef-config'],
    queryFn: getKSeFConfig,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Send mutation
  const sendMutation = useMutation({
    mutationFn: ({ invoiceId, adapter }: { invoiceId: string; adapter?: KSeFAdapterType }) =>
      sendInvoiceToKSeF(invoiceId, adapter),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ksef-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['ksef-statistics'] });
    },
  });

  // Bulk send mutation
  const bulkSendMutation = useMutation({
    mutationFn: ({ invoiceIds, continueOnError }: { invoiceIds: string[]; continueOnError: boolean }) =>
      bulkSendToKSeF(invoiceIds, continueOnError),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ksef-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['ksef-statistics'] });
    },
  });

  // Config mutation
  const configMutation = useMutation({
    mutationFn: (updates: Partial<KSeFConfig>) => updateKSeFConfig(updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ksef-config'] });
    },
  });

  return {
    // Data
    invoices,
    statistics,
    config,

    // Loading
    isLoadingInvoices,
    isLoadingStatistics,
    isLoadingConfig,
    isSending: sendMutation.isPending || bulkSendMutation.isPending,

    // Errors
    invoicesError: invoicesError as Error | null,
    statisticsError: statisticsError as Error | null,

    // Actions
    sendInvoice: (invoiceId: string, adapter?: KSeFAdapterType) =>
      sendMutation.mutate({ invoiceId, adapter }),
    bulkSend: (invoiceIds: string[], continueOnError: boolean = true) =>
      bulkSendMutation.mutate({ invoiceIds, continueOnError }),
    checkStatus: getKSeFStatus,
    downloadUPO: downloadKSeFUPO,
    downloadInvoice: downloadKSeFInvoice,
    updateConfig: configMutation.mutate,
    refetchInvoices,
    refetchStatistics,

    // Mutation results
    lastSendResult: sendMutation.data,
    lastBulkResult: bulkSendMutation.data,
  };
}

export function useKSeFContractors(search?: string) {
  const queryClient = useQueryClient();

  const { data: contractors, isLoading, error } = useQuery({
    queryKey: ['ksef-contractors', search ?? ''],
    queryFn: () => getKSeFContractors(search),
    staleTime: 0,
    retry: 1,
  });

  const createMutation = useMutation({
    mutationFn: createKSeFContractor,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ksef-contractors'] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateKSeFContractorPayload }) =>
      updateKSeFContractor(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ksef-contractors'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteKSeFContractor,
    onMutate: async (id: string) => {
      // Cancel any in-flight refetches
      await queryClient.cancelQueries({ queryKey: ['ksef-contractors'] });
      // Optimistically remove from all contractor query caches
      queryClient.setQueriesData<KSeFContractor[]>(
        { queryKey: ['ksef-contractors'] },
        (old) => old?.filter((c) => c.id !== id) ?? []
      );
    },
    onError: () => {
      // On error, refetch to restore correct state
      queryClient.invalidateQueries({ queryKey: ['ksef-contractors'] });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ksef-contractors'] }),
  });

  const syncMutation = useMutation({
    mutationFn: syncKSeFContractors,
    onSuccess: () => {
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ['ksef-contractors'] }), 2000);
    },
  });

  return {
    contractors: contractors ?? [],
    isLoading,
    error,
    createContractor: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateContractor: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deleteContractor: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    syncContractors: syncMutation.mutate,
    isSyncing: syncMutation.isPending,
  };
}
