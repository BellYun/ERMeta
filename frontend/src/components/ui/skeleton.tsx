import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-md bg-[var(--color-surface-3)]/85", className)} {...props} />;
}

export { Skeleton };
