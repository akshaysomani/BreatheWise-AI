import React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'accent' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 disabled:pointer-events-none select-none rounded-[8px] cursor-pointer';

    const variants = {
      primary:
        'bg-[#397A55] text-white hover:bg-[#2F6647] active:bg-[#27533B] focus-visible:outline-[#397A55]',
      secondary:
        'bg-[#718C72] text-white hover:bg-[#5E7660] active:bg-[#4E6250] focus-visible:outline-[#718C72]',
      outline:
        'border border-[#E2E8DE] bg-white text-[#27352D] hover:bg-[#F7F8F3] hover:border-[#718C72] active:bg-[#EEF3EA] focus-visible:outline-[#397A55]',
      ghost:
        'text-[#27352D] hover:bg-[#EEF3EA] active:bg-[#E2E8DE] focus-visible:outline-[#397A55]',
      accent:
        'bg-[#D69B47] text-[#27352D] font-semibold hover:bg-[#C28B3C] active:bg-[#B07B32] focus-visible:outline-[#D69B47]',
      danger:
        'bg-[#B8423D] text-white hover:bg-[#9E3632] active:bg-[#852C28] focus-visible:outline-[#B8423D]',
    };

    const sizes = {
      sm: 'text-xs h-8 px-3 gap-1.5 min-w-[32px]',
      md: 'text-sm h-10 px-4 gap-2 min-h-[44px]', // ≥44px touch target standard
      lg: 'text-base h-12 px-6 gap-2.5 min-h-[48px]',
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading && (
          <span
            className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-1"
            aria-hidden="true"
          />
        )}
        {!isLoading && leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>}
        <span>{children}</span>
        {!isLoading && rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
