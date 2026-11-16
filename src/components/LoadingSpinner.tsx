import Spinner from '@/components/ui/Spinner';

/** Block-level loader with breathing room. For a spinner inside a button or row, use ui/Spinner. */
export default function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-8 text-brand">
      <Spinner size={size} />
      {size === 'lg' && <p className="text-sm text-ink-subtle">Loading…</p>}
    </div>
  );
}
