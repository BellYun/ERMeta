const CONTENT_PATHS = [
  "/about",
  "/character",
  "/character-lab",
  "/composition-lab",
  "/methodology",
  "/multi-search",
  "/patch-analysis",
  "/patches",
  "/rankings",
  "/season10-recap",
  "/season11-recap",
  "/synergy",
  "/synergy-detail",
  "/synergy-matrix",
  "/updates",
] as const;

function stripLocale(pathname: string) {
  return pathname.replace(/^\/(?:ko|en|ja|zh-Hans|zh-Hant)(?=\/|$)/, "") || "/";
}

function matchesPath(pathname: string, targetPath: string) {
  return pathname === targetPath || pathname.startsWith(`${targetPath}/`);
}

export function canLoadAds(pathname: string) {
  const normalizedPathname = stripLocale(pathname);
  if (normalizedPathname.includes("/preview")) return false;
  if (normalizedPathname === "/") return true;
  return CONTENT_PATHS.some((contentPath) => matchesPath(normalizedPathname, contentPath));
}
