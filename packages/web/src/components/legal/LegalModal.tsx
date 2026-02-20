'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog';
import enTranslations from '@/i18n/locales/en.json';
import plTranslations from '@/i18n/locales/pl.json';
import ruTranslations from '@/i18n/locales/ru.json';

// ============================================
// COMPONENT PROPS
// ============================================

interface LegalModalProps {
  open: boolean;
  onClose: () => void;
  type: 'terms' | 'privacy';
  locale?: 'en' | 'pl' | 'ru';
}

// ============================================
// COMPONENT
// ============================================

export function LegalModal({ open, onClose, type, locale = 'en' }: LegalModalProps) {
  const translations = locale === 'pl' ? plTranslations : locale === 'ru' ? ruTranslations : enTranslations;
  const t = translations.legal;

  const content = type === 'terms' ? t.termsOfService : t.privacyPolicy;
  const title = content.title;
  const lastUpdated = content.lastUpdated;

  // Section keys for each type
  const termsSections = [
    'acceptance',
    'services',
    'accounts',
    'apiKeys',
    'wfirma',
    'intellectualProperty',
    'limitations',
    'termination',
    'changes',
    'contact',
  ] as const;

  const privacySections = [
    'introduction',
    'dataCollection',
    'dataUse',
    'dataStorage',
    'thirdParties',
    'cookies',
    'userRights',
    'security',
    'children',
    'changes',
    'contact',
  ] as const;

  const sections = type === 'terms' ? termsSections : privacySections;
  const sectionsData = content.sections as Record<string, { title: string; content: string }>;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-xl">{title}</DialogTitle>
          <p className="text-sm text-gray-500 dark:text-gray-400">{lastUpdated}</p>
        </DialogHeader>

        <DialogBody className="overflow-y-auto max-h-[50vh] pr-2">
          <div className="space-y-6">
            {sections.map((sectionKey) => {
              const section = sectionsData[sectionKey];
              if (!section) return null;
              return (
                <div key={sectionKey}>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    {section.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    {section.content}
                  </p>
                </div>
              );
            })}
          </div>
        </DialogBody>

        <DialogFooter className="sm:justify-center">
          <Button onClick={onClose} className="w-full sm:w-auto">
            {t.close}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
