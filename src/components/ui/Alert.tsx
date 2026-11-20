import React from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  onClose?: () => void;
}

export function Alert({
  className,
  variant = 'info',
  title,
  children,
  onClose,
  ...props
}: AlertProps) {
  const variants = {
    info: {
      container: 'bg-[#EEF3EA] border-[#CDE0D3] text-[#27352D]',
      icon: <Info className="w-5 h-5 text-[#397A55] shrink-0" aria-hidden="true" />,
    },
    success: {
      container: 'bg-[#EBF5EE] border-[#CBE5D3] text-[#27352D]',
      icon: <CheckCircle2 className="w-5 h-5 text-[#287A4B] shrink-0" aria-hidden="true" />,
    },
    warning: {
      container: 'bg-[#FDF5E6] border-[#F6D9AC] text-[#27352D]',
      icon: <AlertTriangle className="w-5 h-5 text-[#A86B16] shrink-0" aria-hidden="true" />,
    },
    error: {
      container: 'bg-[#FCEBEA] border-[#F6C1BE] text-[#27352D]',
      icon: <AlertCircle className="w-5 h-5 text-[#B8423D] shrink-0" aria-hidden="true" />,
    },
  };

  const selected = variants[variant];

  return (
    <div
      role="alert"
      className={cn(
        'relative flex items-start gap-3 p-4 rounded-[10px] border transition-all',
        selected.container,
        className
      )}
      {...props}
    >
      {selected.icon}
      <div className="flex-1 text-sm">
        {title && <h5 className="font-semibold text-base mb-1 font-[var(--font-heading)]">{title}</h5>}
        <div className="leading-relaxed text-[#27352D]">{children}</div>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="text-[#68766C] hover:text-[#27352D] p-1 rounded hover:bg-black/5 transition-colors"
          aria-label="Dismiss alert"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
