import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_ROUTE_LOCALE, LANGUAGE_BY_ROUTE_LOCALE } from "@/i18n/routing";
import { LANGUAGE_COOKIE } from "@/lib/detectLanguage";
import { getRouteLocaleSegmentFromPathname } from "@/lib/localizedPath";
import { parseSynergyShareSelection } from "@/lib/synergyShare";

const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1년

function applyLanguageCookie(response: NextResponse, cookieLanguage: string) {
  response.cookies.set(LANGUAGE_COOKIE, cookieLanguage, {
    maxAge: COOKIE_MAX_AGE,
    path: "/",
    sameSite: "lax",
  });
}

function getSynergyDetailRedirectPathname(pathname: string, routeLocale: string | null) {
  const localizedSynergyPathname = routeLocale ? `/${routeLocale}/synergy` : "/synergy";
  if (pathname !== localizedSynergyPathname && pathname !== `${localizedSynergyPathname}/`) {
    return null;
  }

  return routeLocale ? `/${routeLocale}/synergy-detail` : "/synergy-detail";
}

function getSynergyShareSelection(pathname: string, routeLocale: string | null) {
  const localizedPrefix = routeLocale ? `/${routeLocale}` : "";
  const sharePrefix = `${localizedPrefix}/synergy-detail/share/`;
  if (!pathname.startsWith(sharePrefix)) return null;

  const selection = pathname.slice(sharePrefix.length).replace(/\/$/, "");
  if (!selection || selection.includes("/")) return null;
  return selection;
}

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const routeLocale = getRouteLocaleSegmentFromPathname(pathname);

  if (pathname === "/synergy-detail/opengraph-image") {
    return NextResponse.next();
  }

  const shareSelection = getSynergyShareSelection(pathname, routeLocale);
  if (shareSelection && !parseSynergyShareSelection(shareSelection)) {
    return new NextResponse("Not Found", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const cookieLanguage = routeLocale
    ? LANGUAGE_BY_ROUTE_LOCALE[routeLocale]
    : LANGUAGE_BY_ROUTE_LOCALE[DEFAULT_ROUTE_LOCALE];
  const synergyDetailRedirectPathname = getSynergyDetailRedirectPathname(pathname, routeLocale);

  if (synergyDetailRedirectPathname) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = synergyDetailRedirectPathname;

    const response = NextResponse.redirect(redirectUrl, 308);
    applyLanguageCookie(response, cookieLanguage);
    return response;
  }

  if (!routeLocale) {
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname =
      pathname === "/" ? `/${DEFAULT_ROUTE_LOCALE}` : `/${DEFAULT_ROUTE_LOCALE}${pathname}`;

    const response = NextResponse.rewrite(rewriteUrl);
    applyLanguageCookie(response, cookieLanguage);
    return response;
  }

  const response = NextResponse.next();
  applyLanguageCookie(response, cookieLanguage);

  return response;
}

// 정적 자산/내부 라우트에서는 미들웨어 스킵 (불필요한 edge 호출 줄이기)
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|ads\\.txt|sitemap|manifest|apple-icon|icon|character/|lab(?:/|$)|landing|character-test|performance-lab/|characters/|CharactER/|TraitSkill/|Item/|l10n/|data/|api/).*)",
  ],
};
