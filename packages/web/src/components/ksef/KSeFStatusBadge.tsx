'use client';

import React, { useState, useCallback } from 'react';
import type { KSeFInvoiceStatus } from '@/lib/api/ksef';

interface KSeFStatusBadgeProps {
  status: KSeFInvoiceStatus;
  errorCode?: string;
  errorMessage?: string;
}

const statusConfig: Record<KSeFInvoiceStatus, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' },
  sending: { label: 'Sending', className: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' },
  sent: { label: 'Sent', className: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' },
  accepted: { label: 'Accepted', className: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' },
  rejected: { label: 'Rejected', className: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' },
  completed: { label: 'Completed', className: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' },
  failed: { label: 'Failed', className: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' },
};

export function KSeFStatusBadge({ status, errorCode, errorMessage }: KSeFStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.pending;
  const hasError = (status === 'failed' || status === 'rejected') && errorMessage;
  const [tooltip, setTooltip] = useState<{ x: number; y: number } | null>(null);

  const handleMouseEnter = useCallback((e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setTooltip({ x: rect.right, y: rect.top });
  }, []);

  const handleMouseLeave = useCallback(() => setTooltip(null), []);

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className} ${hasError ? 'cursor-help' : ''}`}
      onMouseEnter={hasError ? handleMouseEnter : undefined}
      onMouseLeave={hasError ? handleMouseLeave : undefined}
    >
      {config.label}
      {hasError && tooltip && (
        <span
          className="fixed z-[9999] max-w-[min(600px,90vw)] p-3 rounded-md bg-gray-900 dark:bg-gray-700 text-white text-xs font-normal shadow-xl whitespace-pre-wrap break-words pointer-events-none"
          style={{
            right: `${window.innerWidth - tooltip.x}px`,
            top: `${tooltip.y - 8}px`,
            transform: 'translateY(-100%)',
          }}
        >
          {errorCode && <span className="font-mono font-medium">[{errorCode}] </span>}
          {errorMessage}
        </span>
      )}
    </span>
  );
}
