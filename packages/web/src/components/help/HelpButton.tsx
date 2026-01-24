/**
 * Help Button Component
 * Triggers the help panel when clicked
 */

'use client';

import { HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HelpButtonProps {
  onClick: () => void;
  className?: string;
}

export function HelpButton({ onClick, className }: HelpButtonProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      className={`rounded-full ${className || ''}`}
      aria-label="Help"
    >
      <HelpCircle className="h-5 w-5" />
    </Button>
  );
}
