import { NextRequest, NextResponse } from "next/server";
import { getStatsPatchVersions } from "@/data/patch-notes";
import { isRouteLocale, LANGUAGE_BY_ROUTE_LOCALE } from "@/i18n/routing";
import { buildCharacterInsight } from "@/lib/characterInsights";
import { buildFallbackMap, resolveCharacterName } from "@/lib/characterMap";
import { getCachedCharacterStats } from "@/lib/characterStats";
import { loadL10nMap } from "@/lib/serverL10n";
import { resolveWeaponName } from "@/lib/weaponMap";

interface RouteContext {
  params: Promise<{ characterCode: string }>;
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const { characterCode } = await params;
  const code = Number.parseInt(characterCode, 10);

  if (!Number.isFinite(code)) {
    return NextResponse.json({ error: "Invalid character code" }, { status: 400 });
  }

  const searchParams = request.nextUrl.searchParams;
  const patchVersion = searchParams.get("patchVersion") ?? getStatsPatchVersions()[0] ?? "";
  const previousPatch = getStatsPatchVersions().find((patch) => patch !== patchVersion) ?? null;
  const tier = searchParams.get("tier") ?? "DIAMOND_PLUS";
  const localeParam = searchParams.get("locale");
  const locale = localeParam && isRouteLocale(localeParam) ? localeParam : "ko";

  if (!patchVersion) {
    return NextResponse.json({ error: "No patch version available" }, { status: 404 });
  }

  const [stats, previousStats] = await Promise.all([
    getCachedCharacterStats(code, patchVersion, tier),
    previousPatch ? getCachedCharacterStats(code, previousPatch, tier) : null,
  ]);

  if (!stats || stats.totalGames <= 0) {
    return NextResponse.json({ error: "No stats available" }, { status: 404 });
  }

  const l10n = loadL10nMap(LANGUAGE_BY_ROUTE_LOCALE[locale]);
  const characterName = resolveCharacterName(code, l10n, buildFallbackMap());
  const weaponName = stats.weapons[0] ? resolveWeaponName(stats.weapons[0].bestWeapon, l10n) : null;
  const insight = buildCharacterInsight({
    stats,
    previousStats,
    characterName,
    weaponName,
    locale,
  });

  return NextResponse.json({ characterCode: code, insight });
}
