import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Stats ingestion pipeline webhook.
 * 변경된 테이블/실험체에 대응하는 tag 만 무효화하여 L1 Next.js Data Cache 를 즉시 갱신.
 *
 * Usage:
 *   POST /api/internal/revalidate
 *   Headers: { "x-internal-secret": process.env.INTERNAL_REVALIDATE_SECRET, "Content-Type": "application/json" }
 *   Body:    { "tables": ["v2_CharacterTrio", "v2_CharacterTrioWeapon"], "chars": [27, 15] }
 *
 * tag 매핑:
 *   - v2_CharacterTrio                      → "trios"
 *   - v2_CharacterTrioWeapon                → "trios-weapon"
 *   - v2_CharacterTrioWeaponSearch_all      → "trios-weapon"
 *   - v2_CharacterTrioWeaponPairLookup_*    → "trios-weapon"
 *   - v2_CharacterTrioWeaponMemberBucket    → "trios-weapon"
 *   - v2_CharacterStats / CharacterStats    → "character-stats:rows" + "character-stats:patch:<patchVersion>" 등 (lib/characterStats.ts 참조)
 *   - chars 배열의 각 코드               → "trios:char:<n>", "trios-weapon:char:<n>"
 */

const TABLE_TAG_MAP: Record<string, string[]> = {
  v2_CharacterTrio: ["trios"],
  v2_CharacterTrioWeapon: ["trios-weapon"],
  v2_CharacterTrioWeaponSearch_p10: ["trios-weapon"],
  v2_CharacterTrioWeaponSearch_all: ["trios-weapon"],
  v2_CharacterTrioWeaponPairLookup_agg_next: ["trios-weapon"],
  v2_CharacterTrioWeaponPairLookup_all_next: ["trios-weapon"],
  v2_CharacterTrioWeaponMemberBucket: ["trios-weapon"],
  v2_CharacterStats: ["character-stats:rows"],
  CharacterStats: ["character-stats:rows"],
};

interface RevalidateBody {
  tables?: unknown;
  chars?: unknown;
  patches?: unknown;
  tiers?: unknown;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}

function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((v) => Number.isFinite(v));
}

export async function POST(request: NextRequest) {
  const expected = process.env.INTERNAL_REVALIDATE_SECRET;
  if (!expected) {
    console.error("[internal/revalidate] missing secret");
    return NextResponse.json(
      { error: "temporary_unavailable" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }

  const provided = request.headers.get("x-internal-secret");
  if (provided !== expected) {
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  let body: RevalidateBody;
  try {
    body = (await request.json()) as RevalidateBody;
  } catch {
    return NextResponse.json(
      { error: "invalid_request_body" },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  const revalidated = new Set<string>();

  if (isStringArray(body.tables)) {
    for (const table of body.tables) {
      const tags = TABLE_TAG_MAP[table];
      if (!tags) continue;
      for (const tag of tags) revalidated.add(tag);
    }
  }

  if (isNumberArray(body.chars)) {
    for (const char of body.chars) {
      revalidated.add(`trios:char:${char}`);
      revalidated.add(`trios-weapon:char:${char}`);
    }
  }

  if (isStringArray(body.patches)) {
    for (const patch of body.patches) {
      revalidated.add(`character-stats:patch:${patch}`);
    }
  }

  if (isStringArray(body.tiers)) {
    for (const tier of body.tiers) {
      revalidated.add(`character-stats:tier:${tier}`);
    }
  }

  for (const tag of revalidated) {
    // Next.js 16: 2번째 인자로 cache lifetime profile 필요.
    // "default" 는 라우트별 unstable_cache 의 자체 revalidate 값을 유지.
    revalidateTag(tag, "default");
  }

  return NextResponse.json(
    { ok: true, revalidated: Array.from(revalidated) },
    { headers: { "Cache-Control": "no-store" } }
  );
}
