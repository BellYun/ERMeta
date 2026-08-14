import { NextRequest, NextResponse } from "next/server";
import { isRouteLocale, type RouteLocale } from "@/i18n/routing";
import { getTrioCharacterAffinityEvidence } from "@/lib/characterAffinity";
import {
  buildCompositionAffinityKey,
  type CompositionAffinityMemberInput,
} from "@/lib/characterAffinityComposition";

const SNAPSHOT_ID = "season10-11-good-composition-prototypes-v1";
const MAX_COMBOS_PER_REQUEST = 60;
const RESPONSE_HEADERS = {
  "Cache-Control": "private, max-age=3600",
};

interface CompositionAffinityRequestBody {
  locale?: unknown;
  combos?: unknown;
}

function parseMember(value: unknown): CompositionAffinityMemberInput | null {
  if (value == null || typeof value !== "object") return null;
  const { characterCode, weapon } = value as Record<string, unknown>;
  if (
    !Number.isInteger(characterCode) ||
    Number(characterCode) <= 0 ||
    !Number.isInteger(weapon) ||
    Number(weapon) <= 0
  ) {
    return null;
  }
  return { characterCode: Number(characterCode), weapon: Number(weapon) };
}

function parseCombos(value: unknown): CompositionAffinityMemberInput[][] | null {
  if (!Array.isArray(value) || value.length > MAX_COMBOS_PER_REQUEST) return null;

  const deduplicated = new Map<string, CompositionAffinityMemberInput[]>();
  for (const combo of value) {
    if (!Array.isArray(combo) || combo.length !== 3) return null;
    const members = combo.map(parseMember);
    if (members.some((member) => member == null)) return null;
    const parsedMembers = members as CompositionAffinityMemberInput[];
    deduplicated.set(buildCompositionAffinityKey(parsedMembers), parsedMembers);
  }
  return [...deduplicated.values()];
}

export async function POST(request: NextRequest) {
  let body: CompositionAffinityRequestBody;
  try {
    body = (await request.json()) as CompositionAffinityRequestBody;
  } catch {
    return NextResponse.json({ error: "invalid_request_body" }, { status: 400 });
  }

  const combos = parseCombos(body.combos);
  if (!combos) {
    return NextResponse.json({ error: "invalid_combos" }, { status: 400 });
  }
  const locale: RouteLocale =
    typeof body.locale === "string" && isRouteLocale(body.locale) ? body.locale : "ko";
  const results = Object.fromEntries(
    combos.map((members) => {
      const evidence = getTrioCharacterAffinityEvidence(members, locale);
      return [evidence.key, evidence];
    })
  );

  return NextResponse.json({ snapshotId: SNAPSHOT_ID, results }, { headers: RESPONSE_HEADERS });
}
