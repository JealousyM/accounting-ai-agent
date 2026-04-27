import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface Props {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: Props) {
  return (
    <nav className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-6" aria-label="Breadcrumb">
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        return (
          <span key={idx} className="flex items-center">
            {idx > 0 && <ChevronRight className="w-4 h-4 mx-1.5" aria-hidden="true" />}
            {item.href && !isLast ? (
              <Link href={item.href} className="hover:text-gray-900 dark:hover:text-white transition-colors">
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? 'text-gray-900 dark:text-white font-medium' : ''}>{item.label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
