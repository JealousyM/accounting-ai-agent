'use client';

import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  options: SelectOption[];
  error?: boolean;
  placeholder?: string;
  onChange?: (value: string) => void;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    { className, options, error, placeholder, onChange, value, ...props },
    ref
  ) => {
    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      onChange?.(e.target.value);
    };

    return (
      <div className="relative">
        <select
          className={cn(
            'flex h-11 w-full appearance-none rounded-lg border border-gray-300 bg-white px-4 py-2 pr-10 text-sm',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'transition-all duration-200',
            'dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:focus:ring-blue-400',
            error && 'border-red-500 focus:ring-red-500 dark:border-red-500 dark:focus:ring-red-400',
            className
          )}
          ref={ref}
          value={value}
          onChange={handleChange}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none" />
      </div>
    );
  }
);
Select.displayName = 'Select';

export { Select };
