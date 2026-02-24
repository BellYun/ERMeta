import { CharacterCard } from "./CharacterCard"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { getCharacterName, getCharacterImageUrl } from "@/lib/characterMap"
import type { CharacterTrend } from "@/app/api/meta/trending/route"

interface TrendingSectionProps {
  patch?: string;
  tier?: string;
}

async function fetchPatches(): Promise<string[]> {
  try {
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ??
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000");

    const res = await fetch(`${baseUrl}/api/patches/history?limit=10`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { patches?: string[] };
    return data.patches ?? [];
  } catch {
    return [];
  }
}

async function fetchTrending(
  currentPatch: string,
  previousPatch: string,
  tier: string
): Promise<{ rising: CharacterTrend[]; falling: CharacterTrend[] }> {
  try {
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ??
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000");

    const params = new URLSearchParams({
      currentPatch,
      previousPatch,
      tier,
      limit: "4",
    });
    const res = await fetch(`${baseUrl}/api/meta/trending?${params}`, {
      cache: "no-store",
    });
    if (!res.ok) return { rising: [], falling: [] };
    return (await res.json()) as { rising: CharacterTrend[]; falling: CharacterTrend[] };
  } catch {
    return { rising: [], falling: [] };
  }
}

export async function TrendingSection({ patch, tier = "DIAMOND" }: TrendingSectionProps) {
  const patches = await fetchPatches();

  const currentPatch = patch ?? patches[0] ?? "10.3";
  const previousPatch =
    patches.length > 1
      ? patches[patches.indexOf(currentPatch) + 1] ?? patches[1]
      : "10.2";

  const { rising, falling } = await fetchTrending(currentPatch, previousPatch, tier);

  const risingCards = rising.map((c) => ({
    name: getCharacterName(c.characterNum),
    imageUrl: getCharacterImageUrl(c.characterNum),
    rateChange: c.trendScore,
    code: c.characterNum,
  }));

  const fallingCards = falling.map((c) => ({
    name: getCharacterName(c.characterNum),
    imageUrl: getCharacterImageUrl(c.characterNum),
    rateChange: c.trendScore,
    code: c.characterNum,
  }));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <span className="text-lg">🔥</span>
            <span className="text-[var(--color-accent-gold)]">떡상 캐릭터</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            {risingCards.length > 0 ? (
              risingCards.map((char) => (
                <CharacterCard key={char.code} {...char} />
              ))
            ) : (
              <p className="text-xs text-[var(--color-muted-foreground)] py-2">데이터 없음</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <span className="text-lg">📉</span>
            <span className="text-[var(--color-danger)]">떡락 캐릭터</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            {fallingCards.length > 0 ? (
              fallingCards.map((char) => (
                <CharacterCard key={char.code} {...char} />
              ))
            ) : (
              <p className="text-xs text-[var(--color-muted-foreground)] py-2">데이터 없음</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
