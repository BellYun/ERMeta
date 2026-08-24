"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentProps, FocusEvent, PointerEvent } from "react";
import { useCallback, useRef } from "react";

type IntentPrefetchLinkProps = Omit<ComponentProps<typeof Link>, "href" | "prefetch"> & {
  href: string;
};

/**
 * Avoids viewport-driven route prefetch for links rendered on every page.
 * Pointer and keyboard intent still warm the destination before navigation.
 */
export function IntentPrefetchLink({
  href,
  onFocus,
  onPointerEnter,
  ...props
}: IntentPrefetchLinkProps) {
  const router = useRouter();
  const prefetchedHrefRef = useRef<string | null>(null);

  const prefetch = useCallback(() => {
    if (prefetchedHrefRef.current === href) return;
    prefetchedHrefRef.current = href;
    router.prefetch(href);
  }, [href, router]);

  const handlePointerEnter = (event: PointerEvent<HTMLAnchorElement>) => {
    onPointerEnter?.(event);
    if (!event.defaultPrevented) prefetch();
  };

  const handleFocus = (event: FocusEvent<HTMLAnchorElement>) => {
    onFocus?.(event);
    if (!event.defaultPrevented) prefetch();
  };

  return (
    <Link
      {...props}
      href={href}
      prefetch={false}
      onPointerEnter={handlePointerEnter}
      onFocus={handleFocus}
    />
  );
}
