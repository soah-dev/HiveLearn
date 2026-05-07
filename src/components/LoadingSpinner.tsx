export default function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'h-5 w-5', md: 'h-10 w-10', lg: 'h-14 w-14' };
  return (
    <div className="flex flex-col justify-center items-center p-8 gap-3">
      <div className={`${sizes[size]} animate-spin rounded-full border-[3px] border-indigo-200 dark:border-indigo-900 border-t-indigo-600 dark:border-t-indigo-400`} />
      {size === 'lg' && <p className="text-sm text-gray-400 dark:text-gray-500 animate-pulse-soft">Loading...</p>}
    </div>
  );
}
