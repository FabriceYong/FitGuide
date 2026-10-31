/** A grey placeholder shaped like the content that's loading (size it with className). */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-white/[0.06] rounded-2xl animate-pulse ${className}`} aria-hidden="true" />;
}

/** A page's placeholders while it loads: says "Loading" to screen readers once. */
export function LoadingBlocks({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="status" aria-label={label} className="space-y-4">
      {children}
    </div>
  );
}
