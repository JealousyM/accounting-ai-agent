'use client';

import React from 'react';
import { Check, FileText, BarChart3, MessageSquare, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog';

// ============================================
// TRANSLATIONS INTERFACE
// ============================================

export interface WfirmaWelcomeTranslations {
  title: string;
  description: string;
  feature1: string;
  feature2: string;
  feature3: string;
  feature4: string;
  getStarted: string;
}

// ============================================
// COMPONENT
// ============================================

interface WfirmaWelcomeModalProps {
  open: boolean;
  onClose: () => void;
  translations: WfirmaWelcomeTranslations;
}

const features = [
  { icon: FileText, key: 'feature1' as const },
  { icon: BarChart3, key: 'feature2' as const },
  { icon: Sparkles, key: 'feature3' as const },
  { icon: MessageSquare, key: 'feature4' as const },
];

export function WfirmaWelcomeModal({
  open,
  onClose,
  translations: t,
}: WfirmaWelcomeModalProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4">
            <Check className="h-8 w-8 text-white" />
          </div>
          <DialogTitle className="text-center text-xl">{t.title}</DialogTitle>
          <DialogDescription className="text-center">
            {t.description}
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          <div className="space-y-4 py-4">
            {features.map(({ icon: Icon, key }) => (
              <div
                key={key}
                className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 pt-2">
                  {t[key]}
                </p>
              </div>
            ))}
          </div>
        </DialogBody>

        <DialogFooter className="sm:justify-center">
          <Button onClick={onClose} className="w-full sm:w-auto">
            {t.getStarted}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
