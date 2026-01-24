'use client';

import React from 'react';

interface MarkdownLinkProps {
  href?: string;
  children?: React.ReactNode;
  enableFileDownloads?: boolean;
}

export function MarkdownLink({ href, children, enableFileDownloads }: MarkdownLinkProps) {
  const isFileDownload = enableFileDownloads && href?.includes('/api/files/download/');

  return (
    <a
      href={href}
      target={isFileDownload ? '_self' : '_blank'}
      rel={isFileDownload ? undefined : 'noopener noreferrer'}
      download={isFileDownload || undefined}
      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline font-medium inline-flex items-center gap-1"
    >
      {children}
      {isFileDownload && <span className="text-sm">&#11015;</span>}
    </a>
  );
}
