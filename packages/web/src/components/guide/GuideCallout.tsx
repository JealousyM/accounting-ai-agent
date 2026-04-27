import { Info, AlertTriangle, Lightbulb } from 'lucide-react';

type Variant = 'info' | 'warning' | 'tip';

interface Props {
  variant: Variant;
  title: string;
  body: string;
}

const STYLES: Record<Variant, { wrap: string; icon: string; Icon: typeof Info }> = {
  info: {
    wrap: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    icon: 'text-blue-600 dark:text-blue-400',
    Icon: Info,
  },
  warning: {
    wrap: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
    icon: 'text-amber-600 dark:text-amber-400',
    Icon: AlertTriangle,
  },
  tip: {
    wrap: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800',
    icon: 'text-emerald-600 dark:text-emerald-400',
    Icon: Lightbulb,
  },
};

export function GuideCallout({ variant, title, body }: Props) {
  const s = STYLES[variant];
  const Icon = s.Icon;
  return (
    <div role="note" data-variant={variant} className={`flex gap-3 border-l-4 rounded-r-lg p-4 my-4 ${s.wrap}`}>
      <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${s.icon}`} aria-hidden="true" />
      <div>
        <div className="font-semibold text-gray-900 dark:text-white mb-1">{title}</div>
        <div className="text-gray-700 dark:text-gray-300 leading-relaxed">{body}</div>
      </div>
    </div>
  );
}
