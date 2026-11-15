import { forwardRef, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';

const control =
  'w-full rounded-xl border border-line-strong bg-surface text-ink placeholder:text-ink-subtle transition-colors hover:border-ink-subtle disabled:bg-muted disabled:text-ink-muted disabled:hover:border-line-strong';

const controlSizes = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-3.5 text-[15px]',
};

type ControlSize = keyof typeof controlSizes;

interface FieldProps {
  label: ReactNode;
  /** id of the control this label is for. */
  htmlFor?: string;
  /** Quiet note after the label, e.g. "optional". */
  optional?: boolean;
  hint?: ReactNode;
  className?: string;
  children: ReactNode;
}

/** Label + control + hint, with consistent spacing. */
export function Field({ label, htmlFor, optional, hint, className, children }: FieldProps) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-ink">
        {label}
        {optional && <span className="ml-1.5 font-normal text-ink-subtle">optional</span>}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-ink-subtle">{hint}</p>}
    </div>
  );
}

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  controlSize?: ControlSize;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ controlSize = 'md', className, ...rest }, ref) {
  return <input ref={ref} className={cn(control, controlSizes[controlSize], className)} {...rest} />;
});

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  controlSize?: ControlSize;
  /** Classes for the wrapper (width, margin); the select itself fills it. */
  wrapperClassName?: string;
  children: ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { controlSize = 'md', className, wrapperClassName, children, ...rest },
  ref
) {
  return (
    <div className={cn('relative', wrapperClassName)}>
      <select ref={ref} className={cn(control, controlSizes[controlSize], 'appearance-none pr-10', className)} {...rest}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle" aria-hidden="true" />
    </div>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className, ...rest },
  ref
) {
  return <textarea ref={ref} className={cn(control, 'px-3.5 py-2.5 text-[15px]', className)} {...rest} />;
});
