import React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'outline' | 'accent' | 'secondary';
  size?: 'sm' | 'md';
}

export function Badge({ className, variant = 'default', size = 'sm', children, ...props }: BadgeProps) {
  const base =
    'inline-flex items-center font-medium rounded-full transition-colors border select-none';

  const variants = {
    default: 'bg-[#EEF3EA] text-[#397A55] border-[#E2E8DE]',
    success: 'bg-[#EBF5EE] text-[#287A4B] border-[#CBE5D3]',
    warning: 'bg-[#FDF5E6] text-[#A86B16] border-[#F6D9AC]',
    error: 'bg-[#FCEBEA] text-[#B8423D] border-[#F6C1BE]',
    outline: 'bg-transparent text-[#27352D] border-[#E2E8DE]',
    accent: 'bg-[#FDF8EE] text-[#A67528] border-[#F4E0C0]',
    secondary: 'bg-[#F7F8F3] text-[#68766C] border-[#E2E8DE]',
  };

  const sizes = {
    sm: 'text-xs px-2.5 py-0.5 gap-1',
    md: 'text-sm px-3 py-1 gap-1.5',
  };

  return (
    <span className={cn(base, variants[variant], sizes[size], className)} {...props}>
      {children}
    </span>
  );
}
