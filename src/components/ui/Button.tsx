import { ButtonHTMLAttributes, forwardRef, ReactNode } from 'react';
import { cn } from '@/lib/cn';
import Spinner from './Spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'subtle' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 font-semibold whitespace-nowrap select-none transition-colors disabled:opacity-50 disabled:pointer-events-none';

const variants: Record<ButtonVariant, string> = {
  // The one filled, coloured button: reserve it for the main action in a view
  primary: 'bg-brand text-brand-ink hover:bg-brand-hover shadow-[inset_0_-2px_0_rgb(0_0_0/0.14)]',
  secondary: 'bg-surface text-ink border border-line-strong hover:bg-muted',
  subtle: 'bg-muted text-ink hover:bg-line',
  ghost: 'text-ink-muted hover:bg-muted hover:text-ink',
  danger: 'bg-bad-soft text-bad-text hover:bg-bad hover:text-canvas',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm rounded-lg',
  md: 'h-10 px-4 text-sm rounded-xl',
  lg: 'h-12 px-5 text-base rounded-xl',
};

interface StyleOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Stretch to the container's width. */
  block?: boolean;
  className?: string;
}

/** Button styling as a class string, for links that should look like buttons. */
export function buttonClass({ variant = 'primary', size = 'md', block = false, className }: StyleOptions = {}) {
  return cn(base, variants[variant], sizes[size], block && 'w-full', className);
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, StyleOptions {
  /** Shows a spinner and disables the button. */
  loading?: boolean;
  icon?: ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, block, loading = false, icon, className, children, disabled, type = 'button', ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={buttonClass({ variant, size, block, className })}
      {...rest}
    >
      {loading ? <Spinner /> : icon}
      {children}
    </button>
  );
});

export default Button;
