import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { AlertOctagon, RotateCw } from 'lucide-react';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'We encountered an error loading this information. Please verify your connection and try again.',
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center bg-[#FCEBEA] border border-[#F6C1BE] rounded-[12px] my-4',
        className
      )}
    >
      <div className="w-14 h-14 rounded-full bg-[#B8423D]/10 flex items-center justify-center mb-4 text-[#B8423D]">
        <AlertOctagon className="w-8 h-8" />
      </div>
      <h4 className="text-lg font-bold text-[#27352D] font-[var(--font-heading)] mb-2">
        {title}
      </h4>
      <p className="text-sm text-[#68766C] max-w-md leading-relaxed mb-6">
        {message}
      </p>
      {onRetry && (
        <Button
          variant="outline"
          size="md"
          onClick={onRetry}
          leftIcon={<RotateCw className="w-4 h-4" />}
        >
          Try Again
        </Button>
      )}
    </div>
  );
}
