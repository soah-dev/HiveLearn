import { cn } from '@/lib/cn';

const sizes = {
  sm: 'h-8 w-8 text-sm',
  md: 'h-10 w-10 text-base',
  lg: 'h-14 w-14 text-xl',
};

interface AvatarProps {
  name: string | null | undefined;
  image?: string | null;
  size?: keyof typeof sizes;
  /** Dashed outline for someone who has been invited but hasn't joined yet. */
  pending?: boolean;
  className?: string;
}

export default function Avatar({ name, image, size = 'md', pending, className }: AvatarProps) {
  if (image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={image} alt="" className={cn('shrink-0 rounded-full object-cover ring-1 ring-line', sizes[size], className)} />;
  }
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-display font-bold',
        pending ? 'border border-dashed border-line-strong bg-surface text-ink-subtle' : 'bg-brand-soft text-brand-text',
        sizes[size],
        className
      )}
    >
      {(name || '?').trim()[0]?.toUpperCase() || '?'}
    </span>
  );
}
