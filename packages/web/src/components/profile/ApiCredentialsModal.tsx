'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Check, X, Key, Trash2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
} from '@/components/ui/dialog';
import {
  getCredentials,
  setWFirmaCredentials,
  deleteWFirmaCredentials,
  setLLMCredentials,
  deleteLLMCredentials,
  type CredentialsSummary,
} from '@/lib/api/credentials';

// ============================================
// VALIDATION SCHEMAS
// ============================================

const wfirmaSchema = z.object({
  accessKey: z.string().min(1, 'Access key is required'),
  secretKey: z.string().min(1, 'Secret key is required'),
  companyId: z.string().min(1, 'Company ID is required'),
});

const llmSchema = z.object({
  provider: z.enum(['openai', 'anthropic']),
  apiKey: z.string().min(1, 'API key is required'),
});

type WFirmaFormData = z.infer<typeof wfirmaSchema>;
type LLMFormData = z.infer<typeof llmSchema>;

// ============================================
// TRANSLATIONS INTERFACE
// ============================================

export interface ApiCredentialsTranslations {
  title: string;
  description: string;
  wfirmaSection: string;
  wfirmaEnabled: string;
  wfirmaDisabled: string;
  wfirmaAccessKey: string;
  wfirmaSecretKey: string;
  wfirmaCompanyId: string;
  wfirmaCompanyIdPlaceholder: string;
  wfirmaLastValidated: string;
  wfirmaConfigure: string;
  wfirmaUpdate: string;
  llmSection: string;
  llmProvider: string;
  llmApiKey: string;
  llmUsingDefault: string;
  llmUsingCustom: string;
  llmConfigure: string;
  llmUpdate: string;
  save: string;
  saving: string;
  remove: string;
  removing: string;
  cancel: string;
  close: string;
  success: string;
  error: string;
  errorLoad: string;
  errorSaveWfirma: string;
  errorRemoveWfirma: string;
  errorSaveLlm: string;
  errorRemoveLlm: string;
}

// ============================================
// COMPONENT
// ============================================

interface ApiCredentialsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  translations: ApiCredentialsTranslations;
}

export function ApiCredentialsModal({
  open,
  onOpenChange,
  translations: t,
}: ApiCredentialsModalProps) {
  const [credentials, setCredentials] = useState<CredentialsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // wFirma form state
  const [showWfirmaForm, setShowWfirmaForm] = useState(false);
  const [isWfirmaSubmitting, setIsWfirmaSubmitting] = useState(false);
  const [isWfirmaDeleting, setIsWfirmaDeleting] = useState(false);

  // LLM form state
  const [showLlmForm, setShowLlmForm] = useState(false);
  const [isLlmSubmitting, setIsLlmSubmitting] = useState(false);
  const [isLlmDeleting, setIsLlmDeleting] = useState(false);

  const wfirmaForm = useForm<WFirmaFormData>({
    resolver: zodResolver(wfirmaSchema),
    defaultValues: { accessKey: '', secretKey: '', companyId: '' },
  });

  const llmForm = useForm<LLMFormData>({
    resolver: zodResolver(llmSchema),
    defaultValues: { provider: 'openai', apiKey: '' },
  });

  // Load credentials when modal opens
  useEffect(() => {
    if (open) {
      loadCredentials();
    }
  }, [open]);

  const loadCredentials = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getCredentials();
      setCredentials(data);
    } catch (err) {
      setError(t.errorLoad);
    } finally {
      setIsLoading(false);
    }
  };

  // wFirma handlers
  const handleWfirmaSubmit = async (data: WFirmaFormData) => {
    try {
      setIsWfirmaSubmitting(true);
      setError(null);
      await setWFirmaCredentials(data);
      setSuccess(t.success);
      setShowWfirmaForm(false);
      wfirmaForm.reset();
      await loadCredentials();
    } catch (err) {
      setError((err as Error).message || t.errorSaveWfirma);
    } finally {
      setIsWfirmaSubmitting(false);
    }
  };

  const handleWfirmaDelete = async () => {
    try {
      setIsWfirmaDeleting(true);
      setError(null);
      await deleteWFirmaCredentials();
      setSuccess(t.success);
      await loadCredentials();
    } catch (err) {
      setError((err as Error).message || t.errorRemoveWfirma);
    } finally {
      setIsWfirmaDeleting(false);
    }
  };

  // LLM handlers
  const handleLlmSubmit = async (data: LLMFormData) => {
    try {
      setIsLlmSubmitting(true);
      setError(null);
      await setLLMCredentials(data);
      setSuccess(t.success);
      setShowLlmForm(false);
      llmForm.reset();
      await loadCredentials();
    } catch (err) {
      setError((err as Error).message || t.errorSaveLlm);
    } finally {
      setIsLlmSubmitting(false);
    }
  };

  const handleLlmDelete = async () => {
    try {
      setIsLlmDeleting(true);
      setError(null);
      await deleteLLMCredentials();
      setSuccess(t.success);
      await loadCredentials();
    } catch (err) {
      setError((err as Error).message || t.errorRemoveLlm);
    } finally {
      setIsLlmDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            {t.title}
          </DialogTitle>
          <DialogDescription>{t.description}</DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-6">
          {/* Messages */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2">
              <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
              <p className="text-sm text-green-800 dark:text-green-400">{success}</p>
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* wFirma Section */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
                  {t.wfirmaSection}
                </h3>

                {credentials?.wfirma.enabled ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                          <Check className="h-3 w-3" />
                          {t.wfirmaEnabled}
                        </span>
                        {credentials.wfirma.companyId && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Company ID: {credentials.wfirma.companyId}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleWfirmaDelete}
                        disabled={isWfirmaDeleting}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        {isWfirmaDeleting ? t.removing : t.remove}
                      </Button>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowWfirmaForm(!showWfirmaForm)}
                    >
                      {t.wfirmaUpdate}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                      <X className="h-3 w-3" />
                      {t.wfirmaDisabled}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowWfirmaForm(!showWfirmaForm)}
                    >
                      {t.wfirmaConfigure}
                    </Button>
                  </div>
                )}

                {showWfirmaForm && (
                  <form onSubmit={wfirmaForm.handleSubmit(handleWfirmaSubmit)} className="mt-4 space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t.wfirmaAccessKey}
                      </label>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        error={!!wfirmaForm.formState.errors.accessKey}
                        {...wfirmaForm.register('accessKey')}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t.wfirmaSecretKey}
                      </label>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        error={!!wfirmaForm.formState.errors.secretKey}
                        {...wfirmaForm.register('secretKey')}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t.wfirmaCompanyId}
                      </label>
                      <Input
                        type="text"
                        placeholder={t.wfirmaCompanyIdPlaceholder}
                        error={!!wfirmaForm.formState.errors.companyId}
                        {...wfirmaForm.register('companyId')}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" size="sm" loading={isWfirmaSubmitting}>
                        {isWfirmaSubmitting ? t.saving : t.save}
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setShowWfirmaForm(false)}>
                        {t.cancel}
                      </Button>
                    </div>
                  </form>
                )}
              </div>

              {/* LLM Section */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
                  {t.llmSection}
                </h3>

                {credentials?.llm.hasCustomKey ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                          {credentials.llm.provider === 'openai' ? 'OpenAI' : 'Anthropic'}
                        </span>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {t.llmUsingCustom}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleLlmDelete}
                        disabled={isLlmDeleting}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        {isLlmDeleting ? t.removing : t.remove}
                      </Button>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowLlmForm(!showLlmForm)}
                    >
                      {t.llmUpdate}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                      {t.llmUsingDefault}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowLlmForm(!showLlmForm)}
                    >
                      {t.llmConfigure}
                    </Button>
                  </div>
                )}

                {showLlmForm && (
                  <form onSubmit={llmForm.handleSubmit(handleLlmSubmit)} className="mt-4 space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t.llmProvider}
                      </label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        {...llmForm.register('provider')}
                      >
                        <option value="openai">OpenAI</option>
                        <option value="anthropic">Anthropic</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t.llmApiKey}
                      </label>
                      <Input
                        type="password"
                        placeholder="sk-..."
                        error={!!llmForm.formState.errors.apiKey}
                        {...llmForm.register('apiKey')}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" size="sm" loading={isLlmSubmitting}>
                        {isLlmSubmitting ? t.saving : t.save}
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setShowLlmForm(false)}>
                        {t.cancel}
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            </>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
