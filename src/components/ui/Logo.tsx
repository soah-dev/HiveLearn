import { cn } from '@/lib/cn';
import { HEX_PATH } from './Hexagon';

/** The mark on its own: a purple cell with an H. Colours are fixed so it reads on any surface. */
export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={cn('shrink-0', className)} aria-hidden="true">
      <path d={HEX_PATH} fill="#6446E0" />
      <path d="M33 31a4 4 0 0 1 8 0v13h18V31a4 4 0 0 1 8 0v38a4 4 0 0 1-8 0V52H41v17a4 4 0 0 1-8 0Z" fill="#FFFFFF" />
    </svg>
  );
}

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  /** Use on the always-dark brand panel, where theme tokens don't apply. */
  onDark?: boolean;
  className?: string;
}

const sizes = {
  sm: { mark: 24, text: 'text-base' },
  md: { mark: 28, text: 'text-lg' },
  lg: { mark: 40, text: 'text-2xl' },
};

export default function Logo({ size = 'md', onDark = false, className }: LogoProps) {
  const s = sizes[size];
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <LogoMark size={s.mark} />
      <span className={cn('font-display font-bold tracking-tight', s.text, onDark ? 'text-[#F1EFF8]' : 'text-ink')}>
        Hive<span className={onDark ? 'text-[#B4A4FF]' : 'text-brand-text'}>Excel</span>
      </span>
    </span>
  );
}
