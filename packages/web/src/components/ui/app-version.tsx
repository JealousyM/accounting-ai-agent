import { cn } from '@/lib/utils';

interface AppVersionProps {
  className?: string;
}

export function AppVersion({ className }: AppVersionProps) {
  const version = process.env.NEXT_PUBLIC_APP_VERSION || '0.0.0';

  return (
    <span className={cn('text-xs text-gray-400', className)}>
      v{version}
    </span>
  );
}
