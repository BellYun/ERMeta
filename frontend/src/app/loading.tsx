export default function Loading() {
  return (
    <div className="flex flex-col gap-8">
      <section>
        <div className="mb-4">
          <div className="h-7 w-40 rounded-md bg-[var(--color-surface-2)] animate-pulse" />
          <div className="mt-1 h-4 w-72 rounded-md bg-[var(--color-surface-2)] animate-pulse" />
        </div>
        <div className="h-96 rounded-lg bg-[var(--color-surface-2)] animate-pulse" />
      </section>
    </div>
  )
}
