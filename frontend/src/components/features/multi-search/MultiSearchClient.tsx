"use client";

import { AlertTriangle, Loader2, Search, Trophy, Users } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { getFallbackMap } from "@/components/features/synergy/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MultiSearchResponse {
  seasonId: number;
  matchingMode: number;
  results: PlayerResult[];
}

interface PlayerResult {
  input: string;
  status: "ok" | "not_found" | "no_stats" | "error";
  nickname?: string;
  seasonId?: number;
  matchingMode?: number;
  matchingTeamMode?: number;
  mmr?: number;
  rank?: number;
  rankSize?: number;
  totalGames?: number;
  totalWins?: number;
  winRate?: number;
  top3Rate?: number;
  averageRank?: number;
  averageKills?: number;
  averageAssistants?: number;
  topCharacters?: Array<{
    characterCode: number;
    totalGames: number;
    wins: number;
    winRate: number;
    top3: number;
    top3Rate: number;
    averageRank: number;
    maxKillings: number;
  }>;
  reason?: string;
}

const EMPTY_INPUTS = ["", "", ""];

export function MultiSearchClient() {
  const [inputs, setInputs] = useState<string[]>(EMPTY_INPUTS);
  const [data, setData] = useState<MultiSearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const characterNames = useMemo(() => getFallbackMap(), []);

  const normalizedNicknames = useMemo(
    () => inputs.map((value) => value.trim()).filter(Boolean),
    [inputs]
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (normalizedNicknames.length === 0) {
      setError("검색할 팀원 닉네임을 입력해주세요.");
      setData(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/multi-search/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nicknames: normalizedNicknames }),
      });

      const payload = await response.json();
      if (!response.ok) {
        const message = Array.isArray(payload?.message)
          ? payload.message.join(" ")
          : payload?.message || "멀티서치 요청에 실패했습니다.";
        throw new Error(message);
      }

      setData(payload as MultiSearchResponse);
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : "멀티서치 요청에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  function updateInput(index: number, value: string) {
    setInputs((current) => current.map((item, itemIndex) => (itemIndex === index ? value : item)));
  }

  return (
    <div className="flex flex-col gap-5">
      <form
        onSubmit={handleSubmit}
        className="rounded-[22px] border border-[var(--color-border)] bg-[rgba(15,23,42,0.72)] p-4 shadow-[0_20px_48px_-36px_rgba(0,0,0,0.68)] sm:p-5"
      >
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
          {inputs.map((value, index) => (
            <label key={index} className="flex min-w-0 flex-col gap-2">
              <span className="text-xs font-semibold text-[var(--color-muted-foreground)]">
                팀원 {index + 1}
              </span>
              <input
                value={value}
                onChange={(event) => updateInput(index, event.target.value)}
                maxLength={16}
                autoComplete="off"
                placeholder="닉네임"
                className="h-11 rounded-xl border border-[var(--color-border)] bg-[rgba(8,13,25,0.86)] px-3 text-sm font-semibold text-[var(--color-foreground)] outline-none transition focus:border-[rgba(96,165,250,0.52)] focus:ring-2 focus:ring-[rgba(96,165,250,0.16)]"
              />
            </label>
          ))}
          <Button type="submit" size="lg" disabled={isLoading} className="mt-auto h-11 md:min-w-28">
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            검색
          </Button>
        </div>
        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-[rgba(248,113,113,0.28)] bg-[rgba(127,29,29,0.18)] px-3 py-2 text-sm text-[var(--color-danger)]">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </form>

      {data && (
        <section className="grid gap-4 lg:grid-cols-3">
          {data.results.map((result) => (
            <PlayerCard
              key={result.input}
              result={result}
              getCharacterName={(code) => characterNames.get(code) ?? `#${code}`}
            />
          ))}
        </section>
      )}
    </div>
  );
}

function PlayerCard({
  result,
  getCharacterName,
}: {
  result: PlayerResult;
  getCharacterName: (code: number) => string;
}) {
  if (result.status !== "ok") {
    return (
      <Card className="min-h-56">
        <CardContent className="flex h-full flex-col justify-between gap-5 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[rgba(248,113,113,0.24)] bg-[rgba(127,29,29,0.18)] text-[var(--color-danger)]">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-bold text-[var(--color-foreground)]">
                {result.input}
              </p>
              <p className="text-xs font-semibold text-[var(--color-muted-foreground)]">
                {statusText(result.status)}
              </p>
            </div>
          </div>
          <p className="text-sm leading-6 text-[var(--color-muted-foreground)]">
            닉네임을 다시 확인하거나 시즌 39 랭크 기록이 있는 팀원을 검색해주세요.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="flex flex-col gap-5 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-lg font-black text-[var(--color-foreground)]">
              {result.nickname}
            </p>
            <p className="mt-1 text-xs font-semibold text-[var(--color-muted-foreground)]">
              시즌 {result.seasonId} · 스쿼드 랭크
            </p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[rgba(96,165,250,0.26)] bg-[rgba(96,165,250,0.12)] text-[var(--color-primary)]">
            <Trophy className="h-5 w-5" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Metric label="랭크" value={formatRank(result.rank, result.rankSize)} strong />
          <Metric label="MMR" value={formatNumber(result.mmr)} strong />
          <Metric label="승률" value={`${formatNumber(result.winRate)}%`} />
          <Metric label="Top 3" value={`${formatNumber(result.top3Rate)}%`} />
          <Metric label="평균 순위" value={formatNumber(result.averageRank)} />
          <Metric label="평균 킬" value={formatNumber(result.averageKills)} />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--color-muted-foreground)]">
            <Users className="h-3.5 w-3.5" />
            주력 캐릭터
          </div>
          <div className="flex flex-col gap-2">
            {(result.topCharacters ?? []).map((character) => (
              <div
                key={character.characterCode}
                className="grid grid-cols-[1fr_auto] gap-3 rounded-xl border border-[var(--color-border)] bg-[rgba(255,255,255,0.03)] px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-[var(--color-foreground)]">
                    {getCharacterName(character.characterCode)}
                  </p>
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    {character.totalGames}게임 · 승률 {formatNumber(character.winRate)}%
                  </p>
                </div>
                <div
                  className={cn(
                    "text-right text-xs font-semibold",
                    character.top3Rate >= 50
                      ? "text-[var(--color-stat-up)]"
                      : "text-[var(--color-muted-foreground)]"
                  )}
                >
                  Top 3
                  <br />
                  {formatNumber(character.top3Rate)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[rgba(255,255,255,0.03)] px-3 py-2">
      <p className="text-[11px] font-semibold text-[var(--color-muted-foreground)]">{label}</p>
      <p
        className={cn(
          "mt-1 truncate font-black text-[var(--color-foreground)]",
          strong ? "text-lg" : "text-base"
        )}
      >
        {value}
      </p>
    </div>
  );
}

function statusText(status: PlayerResult["status"]) {
  if (status === "not_found") return "닉네임을 찾을 수 없습니다.";
  if (status === "no_stats") return "시즌 통계가 없습니다.";
  return "검색 중 오류가 발생했습니다.";
}

function formatNumber(value: number | undefined) {
  if (value == null || Number.isNaN(value)) return "-";
  return new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 2 }).format(value);
}

function formatRank(rank: number | undefined, rankSize: number | undefined) {
  if (!rank) return "-";
  if (!rankSize) return `#${formatNumber(rank)}`;
  return `#${formatNumber(rank)} / ${formatNumber(rankSize)}`;
}
