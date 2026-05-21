import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * ERmangho 수집 파이프라인이 5분 주기 수집 완료 시 호출하는 내부 webhook.
 * 변경된 테이블/캐릭터에 대응하는 tag 만 무효화하여 L1 Next.js Data Cache 를 즉시 갱신.
 *
 * 사용 예 (ERmangho):
 *   POST /api/internal/revalidate
 *   Headers: { "x-internal-secret": process.env.INTERNAL_REVALIDATE_SECRET, "Content-Type": "application/json" }
 *   Body:    { "tables": ["v2_CharacterTrio", "v2_CharacterTrioWeapon"], "chars": [27, 15] }
 *
 * tag 매핑:
 *   - v2_CharacterTrio                      → "trios"
 *   - v2_CharacterTrioWeapon                → "trios-weapon"
 *   - v2_CharacterTrioWeaponSearch_p10      → "trios-weapon"
 *   - v2_CharacterStats / CharacterStats    → "character-stats:rows" + "character-stats:patch:<patchVersion>" 등 (lib/characterStats.ts 참조)
 *   - chars 배열의 각 코드               → "trios:char:<n>", "trios-weapon:char:<n>"
 */

const TABLE_TAG_MAP: Record<string, string[]> = {
  v2_CharacterTrio: ["trios"],
  v2_CharacterTrioWeapon: ["trios-weapon"],
  v2_CharacterTrioWeaponSearch_p10: ["trios-weapon"],
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
    console.error("[internal/revalidate] INTERNAL_REVALIDATE_SECRET 미설정");
    return NextResponse.json(
      { error: "server misconfigured" },
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
      { error: "invalid JSON body" },
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
    revalidateTag(tag);
  }

  return NextResponse.json(
    { ok: true, revalidated: Array.from(revalidated) },
    { headers: { "Cache-Control": "no-store" } }
  );
}
