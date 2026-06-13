"use client";

import type { ReactNode } from "react";
import { useSyncExternalStore } from "react";
import { Link } from "@/i18n/navigation";
import { buildTrioLabDetailHref, buildTrioLabListHref, parseTrioLabUrlState } from "./urlState";

interface BaseLinkProps {
  children: ReactNode;
  className?: string;
  scroll?: boolean;
}

function subscribeToLocationChange(callback: () => void) {
  window.addEventListener("popstate", callback);
  return () => window.removeEventListener("popstate", callback);
}

function getLocationSearch() {
  return window.location.search;
}

function getServerSearch() {
  return "";
}

function useCurrentSearchParams() {
  const search = useSyncExternalStore(
    subscribeToLocationChange,
    getLocationSearch,
    getServerSearch
  );
  return search ? new URLSearchParams(search) : null;
}

export function TrioLabListLink({ children, className, scroll = false }: BaseLinkProps) {
  const searchParams = useCurrentSearchParams();
  const href = searchParams
    ? buildTrioLabListHref(parseTrioLabUrlState(searchParams))
    : "/trio-lab";

  return (
    <Link href={href} scroll={scroll} className={className}>
      {children}
    </Link>
  );
}

export function TrioLabDetailLink({
  children,
  className,
  comboId,
  prefetch,
  scroll = false,
}: BaseLinkProps & {
  comboId: string;
  prefetch?: boolean;
}) {
  const searchParams = useCurrentSearchParams();
  const href = searchParams
    ? buildTrioLabDetailHref(comboId, parseTrioLabUrlState(searchParams))
    : `/trio-lab/${comboId}`;

  return (
    <Link href={href} prefetch={prefetch} scroll={scroll} className={className}>
      {children}
    </Link>
  );
}
