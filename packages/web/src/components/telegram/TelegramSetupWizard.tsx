'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bot,
  Send,
  CheckCircle,
  ArrowRight,
  Loader2,
  AlertCircle,
  Unlink,
  MessageSquare,
  Camera,
  Bell,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getTelegramStatus, linkTelegram, unlinkTelegram } from '@/lib/api/telegram';

export interface TelegramSetupTranslations {
  title: string;
  subtitle: string;
  step1: {
    label: string;
    title: string;
    description: string;
    openButton: string;
    nextButton: string;
  };
  step2: {
    label: string;
    title: string;
    description: string;
    codePlaceholder: string;
    linkButton: string;
    waitingHint: string;
  };
  step3: {
    label: string;
    title: string;
    description: string;
    feature1: string;
    feature2: string;
    feature3: string;
    goToChat: string;
  };
  settingsTitle: string;
  linkedAs: string;
  linkButton: string;
  unlinkButton: string;
  notLinked: string;
}

const BOT_USERNAME = 'eKsiegowyAIBot';
const BOT_LINK = `https://t.me/${BOT_USERNAME}`;

type WizardStep = 1 | 2 | 3;

interface TelegramSetupWizardProps {
  translations: TelegramSetupTranslations;
}

export function TelegramSetupWizard({ translations: t }: TelegramSetupWizardProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<WizardStep>(1);
  const [code, setCode] = useState('');
  const [linkError, setLinkError] = useState<string | null>(null);

  const { data: status, isLoading } = useQuery({
    queryKey: ['telegram-status'],
    queryFn: getTelegramStatus,
    refetchInterval: step === 2 ? 2000 : false,
  });

  const linkMutation = useMutation({
    mutationFn: linkTelegram,
    onSuccess: () => {
      setCode('');
      setLinkError(null);
      setStep(3);
      queryClient.invalidateQueries({ queryKey: ['telegram-status'] });
    },
    onError: (err: Error) => {
      setLinkError(err.message || 'Failed to link Telegram');
    },
  });

  const unlinkMutation = useMutation({
    mutationFn: unlinkTelegram,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['telegram-status'] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (status?.linked && step !== 3) {
    return <LinkedSettings status={status} translations={t} unlinkMutation={unlinkMutation} />;
  }

  if (step === 3 || (status?.linked && step === 3)) {
    return <StepDone translations={t} status={status} />;
  }

  return (
    <div className="max-w-xl mx-auto">
      <StepIndicator current={step} />

      {step === 1 && (
        <StepFindBot
          translations={t.step1}
          onNext={() => setStep(2)}
        />
      )}

      {step === 2 && (
        <StepLinkAccount
          translations={t.step2}
          code={code}
          onCodeChange={setCode}
          error={linkError}
          isLinking={linkMutation.isPending}
          onLink={() => {
            if (code.trim().length === 6) {
              setLinkError(null);
              linkMutation.mutate(code.trim());
            }
          }}
        />
      )}
    </div>
  );
}

function StepIndicator({ current }: { current: WizardStep }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {([1, 2, 3] as WizardStep[]).map((n) => (
        <React.Fragment key={n}>
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
              n < current
                ? 'bg-green-500 text-white'
                : n === current
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
            }`}
          >
            {n < current ? <CheckCircle className="w-4 h-4" /> : n}
          </div>
          {n < 3 && (
            <div
              className={`flex-1 h-1 rounded transition-colors ${
                n < current ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
              }`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function StepFindBot({
  translations: t,
  onNext,
}: {
  translations: TelegramSetupTranslations['step1'];
  onNext: () => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-1">
          {t.label}
        </p>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t.title}</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-2">{t.description}</p>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-5 flex items-center gap-4">
        <Bot className="w-10 h-10 text-blue-600 dark:text-blue-400 flex-shrink-0" />
        <div>
          <p className="font-semibold text-gray-900 dark:text-white">@{BOT_USERNAME}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">eKsięgowy AI</p>
        </div>
      </div>

      <a href={BOT_LINK} target="_blank" rel="noopener noreferrer" className="block">
        <Button className="w-full gap-2" size="lg">
          <Send className="w-4 h-4" />
          {t.openButton}
          <ExternalLink className="w-3.5 h-3.5 ml-auto opacity-60" />
        </Button>
      </a>

      <Button variant="outline" className="w-full gap-2" size="lg" onClick={onNext}>
        {t.nextButton}
        <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
}

function StepLinkAccount({
  translations: t,
  code,
  onCodeChange,
  error,
  isLinking,
  onLink,
}: {
  translations: TelegramSetupTranslations['step2'];
  code: string;
  onCodeChange: (code: string) => void;
  error: string | null;
  isLinking: boolean;
  onLink: () => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-1">
          {t.label}
        </p>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t.title}</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-2">{t.description}</p>
      </div>

      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-3 text-sm font-mono text-gray-700 dark:text-gray-300">
          <span className="bg-gray-200 dark:bg-gray-700 px-3 py-1 rounded">/link</span>
          <ArrowRight className="w-4 h-4 text-gray-400" />
          <span className="text-gray-500 dark:text-gray-400">→ 6-digit code</span>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">{t.waitingHint}</p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
        </div>
      )}

      <div className="flex gap-3">
        <Input
          type="text"
          value={code}
          onChange={(e) => onCodeChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
          onKeyDown={(e) => e.key === 'Enter' && onLink()}
          placeholder={t.codePlaceholder}
          className="flex-1 font-mono text-center tracking-widest text-lg"
          maxLength={6}
          autoFocus
        />
        <Button
          onClick={onLink}
          disabled={code.trim().length !== 6 || isLinking}
          size="lg"
          className="gap-2"
        >
          {isLinking ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ArrowRight className="w-4 h-4" />
          )}
          {t.linkButton}
        </Button>
      </div>
    </div>
  );
}

function StepDone({
  translations: t,
  status,
}: {
  translations: TelegramSetupTranslations['step3'];
  status?: { linked: boolean; username?: string; firstName?: string };
}) {
  const displayName = status?.username
    ? `@${status.username}`
    : status?.firstName || 'Telegram';

  const features = [
    { icon: MessageSquare, text: t.feature1 },
    { icon: Camera, text: t.feature2 },
    { icon: Bell, text: t.feature3 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center text-center py-6">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
          <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <p className="text-xs font-medium text-green-600 dark:text-green-400 uppercase tracking-wide mb-1">
          {t.label}
        </p>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t.title}</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-1">{displayName}</p>
      </div>

      <p className="text-gray-600 dark:text-gray-400">{t.description}</p>

      <div className="space-y-3">
        {features.map(({ icon: Icon, text }, i) => (
          <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-gray-700 dark:text-gray-300">{text}</p>
          </div>
        ))}
      </div>

      <Link href="/chat">
        <Button className="w-full gap-2" size="lg">
          <MessageSquare className="w-4 h-4" />
          {t.goToChat}
        </Button>
      </Link>
    </div>
  );
}

function LinkedSettings({
  status,
  translations: t,
  unlinkMutation,
}: {
  status: { linked: boolean; username?: string; firstName?: string };
  translations: TelegramSetupTranslations;
  unlinkMutation: { mutate: () => void; isPending: boolean };
}) {
  const displayName = status.username
    ? `@${status.username}`
    : status.firstName || 'Telegram';

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0" />
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">{t.settingsTitle}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t.linkedAs} <span className="font-medium text-gray-700 dark:text-gray-300">{displayName}</span>
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => unlinkMutation.mutate()}
          disabled={unlinkMutation.isPending}
          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 flex-shrink-0"
        >
          <Unlink className="h-4 w-4 mr-1" />
          {unlinkMutation.isPending ? '…' : t.unlinkButton}
        </Button>
      </div>

      <div className="space-y-3">
        {[
          { icon: MessageSquare, text: t.step3.feature1 },
          { icon: Camera, text: t.step3.feature2 },
          { icon: Bell, text: t.step3.feature3 },
        ].map(({ icon: Icon, text }, i) => (
          <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-gray-700 dark:text-gray-300">{text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
