export const ANNOUNCEMENT_COLLAPSE_SCROLL_Y = 96;
export const ANNOUNCEMENT_EXPAND_SCROLL_Y = 16;

interface ResolveAnnouncementCollapsedArgs {
  currentlyCollapsed: boolean;
  scrollY: number;
  hasFocus: boolean;
}

export function resolveAnnouncementCollapsed({
  currentlyCollapsed,
  scrollY,
  hasFocus,
}: ResolveAnnouncementCollapsedArgs) {
  if (hasFocus) return false;

  return currentlyCollapsed
    ? scrollY > ANNOUNCEMENT_EXPAND_SCROLL_Y
    : scrollY > ANNOUNCEMENT_COLLAPSE_SCROLL_Y;
}
