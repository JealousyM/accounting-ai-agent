import React from 'react';

interface Props {
  number: number;
  title: string;
  children: React.ReactNode;
}

export function GuideStep({ number, title, children }: Props) {
  return (
    <section className="border-l-2 border-blue-200 dark:border-blue-800 pl-6 pb-2">
      <div className="flex items-center gap-3 mb-3">
        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white font-semibold flex items-center justify-center text-sm">
          {number}
        </span>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h2>
      </div>
      <div className="text-gray-700 dark:text-gray-300 leading-relaxed space-y-3">{children}</div>
    </section>
  );
}
