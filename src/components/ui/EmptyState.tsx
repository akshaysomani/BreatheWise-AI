import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Inbox } from 'lucide-react';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon = <Inbox className="w-12 h-12 text-[#718C72]" />,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center bg-white border border-[#E2E8DE] rounded-[12px] my-4',
        className
      )}
    >
      <div className="w-16 h-16 rounded-full bg-[#EEF3EA] flex items-center justify-center mb-4">
        {icon}
      </div>
      <h4 className="text-lg font-bold text-[#27352D] font-[var(--font-heading)] mb-2">
        {title}
      </h4>
      <p className="text-sm text-[#68766C] max-w-md leading-relaxed mb-6">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button variant="primary" size="md" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
