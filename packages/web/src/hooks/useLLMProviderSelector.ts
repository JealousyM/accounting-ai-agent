'use client';

import { useState, useEffect } from 'react';
import type { UseFormWatch } from 'react-hook-form';
import type { RegistrationFormData } from '@/lib/validations/auth';
import { getPublicLLMModels, type LLMModelInfo } from '@/lib/api/auth';

export function useLLMProviderSelector(watch: UseFormWatch<RegistrationFormData>) {
  const [availableModels, setAvailableModels] = useState<LLMModelInfo[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const llmProvider = watch('llmProvider');
  const llmApiKey = watch('llmApiKey');

  useEffect(() => {
    const fetchModels = async () => {
      if (!llmProvider || !llmApiKey || llmApiKey.length < 10) {
        setAvailableModels([]);
        return;
      }

      setIsLoadingModels(true);
      try {
        const models = await getPublicLLMModels(llmProvider as 'openai' | 'google', llmApiKey);
        setAvailableModels(models);
      } catch {
        setAvailableModels([]);
      } finally {
        setIsLoadingModels(false);
      }
    };

    const timer = setTimeout(fetchModels, 500);
    return () => clearTimeout(timer);
  }, [llmProvider, llmApiKey]);

  return { availableModels, isLoadingModels, llmProvider };
}
