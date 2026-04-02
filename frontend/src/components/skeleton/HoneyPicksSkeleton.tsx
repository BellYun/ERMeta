export function HoneyPicksSkeleton() {
  return (
    <>
      {/* Desktop */}
      <div className="hidden sm:grid grid-cols-2 gap-2.5">
        <div className="col-span-2 h-[72px] rounded-xl bg-[var(--color-surface)] animate-pulse" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[72px] rounded-xl bg-[var(--color-surface)] animate-pulse" />
        ))}
      </div>
      {/* Mobile */}
      <div className="sm:hidden grid grid-cols-2 gap-2.5">
        <div className="col-span-2 rounded-xl bg-[var(--color-surface)] animate-pulse" style={{ aspectRatio: "16/9" }} />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl bg-[var(--color-surface)] animate-pulse" style={{ aspectRatio: "3/4" }} />
        ))}
      </div>
    </>
  )
}
