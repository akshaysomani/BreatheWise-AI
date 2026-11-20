import React from 'react';
import { cn } from '@/lib/utils';

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-[8px] bg-[#EEF3EA]', className)}
      aria-busy="true"
      aria-live="polite"
      {...props}
    />
  );
}

export function Spinner({
  size = 'md',
  className,
}: {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sizeMap = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-3',
  };

  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn(
        'inline-block animate-spin rounded-full border-[#397A55] border-t-transparent',
        sizeMap[size],
        className
      )}
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}
