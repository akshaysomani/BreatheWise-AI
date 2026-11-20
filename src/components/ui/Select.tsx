import React from 'react';
import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  helperText?: string;
  error?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, options, helperText, error, id, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={selectId} className="block text-sm font-medium text-[#27352D]">
            {label}
          </label>
        )}
        <select
          id={selectId}
          ref={ref}
          className={cn(
            'w-full h-11 px-3.5 bg-white border rounded-[8px] text-[#27352D] text-sm transition-colors cursor-pointer',
            'border-[#E2E8DE] focus:border-[#397A55] focus:outline-2 focus:outline-[#397A55] focus:outline-offset-1',
            'disabled:bg-[#F7F8F3] disabled:text-[#68766C] disabled:cursor-not-allowed',
            error && 'border-[#B8423D] focus:border-[#B8423D] focus:outline-[#B8423D]',
            className
          )}
          aria-invalid={Boolean(error)}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && (
          <p className="text-xs text-[#B8423D] mt-1 font-medium" role="alert">
            {error}
          </p>
        )}
        {!error && helperText && (
          <p className="text-xs text-[#68766C] mt-1">{helperText}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
