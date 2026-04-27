import { ExternalLink } from 'lucide-react';

interface Props {
  href: string;
  label: string;
}

export function GuideExternalLink({ href, label }: Props) {
  const isExternal = /^https?:\/\//.test(href);
  return (
    <a
      href={href}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noopener noreferrer' : undefined}
      className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:underline"
    >
      {label}
      {isExternal && <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />}
    </a>
  );
}
