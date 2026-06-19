export function HoneyPicksSkeleton() {
  return (
    <>
      {/* Desktop */}
      <div className="hidden sm:grid grid-cols-2 gap-2.5">
        <div className="col-span-2 h-[72px] rounded-lg bg-[var(--color-surface)]" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[72px] rounded-lg bg-[var(--color-surface)]" />
        ))}
      </div>
      {/* Mobile */}
      <div className="sm:hidden grid grid-cols-2 gap-2.5">
        <div
          className="col-span-2 rounded-lg bg-[var(--color-surface)]"
          style={{ aspectRatio: "16/9" }}
        />
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg bg-[var(--color-surface)]"
            style={{ aspectRatio: "3/4" }}
          />
        ))}
      </div>
    </>
  );
}
