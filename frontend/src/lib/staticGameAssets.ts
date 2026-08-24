export const STATIC_GAME_ASSET_VERSION = "2026-08-25.1";

/**
 * Public game assets are served with a one-year immutable browser cache.
 * Bump STATIC_GAME_ASSET_VERSION whenever an existing file is replaced in place.
 */
export function getVersionedStaticGameAssetUrl(pathname: string): string {
  const separator = pathname.includes("?") ? "&" : "?";
  return `${pathname}${separator}v=${STATIC_GAME_ASSET_VERSION}`;
}
