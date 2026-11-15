import { cn } from '@/lib/cn';

const sizes = { sm: 'h-4 w-4 border-2', md: 'h-8 w-8 border-[3px]', lg: 'h-12 w-12 border-[3px]' };

/** Inline spinner with no padding of its own, safe inside buttons and rows. */
export default function Spinner({ size = 'sm', className }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn('inline-block shrink-0 animate-spin rounded-full border-current border-r-transparent', sizes[size], className)}
    />
  );
}
