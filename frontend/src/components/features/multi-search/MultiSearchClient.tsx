"use client";

import { AlertTriangle, Loader2, Search, Swords, Trophy, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { getFallbackMap } from "@/components/features/synergy/constants";
import { getCharacterWeaponOptions } from "@/components/features/trio-lab/searchRequests";
import {
  comboTier,
  characterDisplayName,
  weaponDisplayName,
  type TrioWeaponCombo,
} from "@/components/features/trio-lab/types";
import { buildTrioLabDetailHref } from "@/components/features/trio-lab/urlState";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getCharacterMiniWebpUrl } from "@/lib/characterMap";
import { withCurrentRouteLocale } from "@/lib/localizedPath";
import { cn } from "@/lib/utils";

interface MultiSearchResponse {
  seasonId: number;
  matchingMode: number;
  results: PlayerResult[];
  summary?: {
    requested: number;
    ok: number;
    failed: number;
  };
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
  reason?:
    | "nickname_not_found"
    | "season_stats_not_found"
    | "bser_api_key_missing"
    | "bser_api_unavailable"
    | "unknown_error";
}

interface TeamCombosResponse {
  results: TrioWeaponCombo[];
}

const TOP_CHARACTER_LIMIT = 3;
const MY_NICKNAME_STORAGE_KEY = "ermeta:multi-search:my-nickname";

export function MultiSearchClient() {
  const [myNickname, setMyNickname] = useState("");
  const [teammateInputs, setTeammateInputs] = useState<[string, string]>(["", ""]);
  const [myProfile, setMyProfile] = useState<PlayerResult | null>(null);
  const [myWeaponFilters, setMyWeaponFilters] = useState<Record<number, number>>({});
  const [data, setData] = useState<MultiSearchResponse | null>(null);
  const [teamCombos, setTeamCombos] = useState<TrioWeaponCombo[]>([]);
  const [teammateCharacterFilters, setTeammateCharacterFilters] = useState<Array<number | null>>([
    null,
    null,
  ]);
  const [isComboLoading, setIsComboLoading] = useState(false);
  const [comboError, setComboError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMyLoading, setIsMyLoading] = useState(false);
  const [isTeamLoading, setIsTeamLoading] = useState(false);
  const characterNames = useMemo(() => getFallbackMap(), []);

  const teammateNicknames = useMemo(() => {
    return buildTeammateNicknames(teammateInputs);
  }, [teammateInputs]);
  const searchSummary = useMemo(() => buildSearchSummary(data?.results ?? []), [data]);

  useEffect(() => {
    try {
      setMyNickname(localStorage.getItem(MY_NICKNAME_STORAGE_KEY) ?? "");
    } catch {
      /* localStorage unavailable */
    }
  }, []);

  useEffect(() => {
    try {
      const trimmed = myNickname.trim();
      if (trimmed) {
        localStorage.setItem(MY_NICKNAME_STORAGE_KEY, trimmed);
      } else {
        localStorage.removeItem(MY_NICKNAME_STORAGE_KEY);
      }
    } catch {
      /* localStorage unavailable */
    }
  }, [myNickname]);

  useEffect(() => {
    let cancelled = false;

    async function loadTeamRecommendations() {
      const players = data?.results.filter((result) => result.status === "ok") ?? [];
      if (players.length !== 3) {
        setTeamCombos([]);
        setComboError(null);
        setIsComboLoading(false);
        return;
      }

      const pools = players.map((player) => getTopCharacterCodes(player));
      if (pools.some((pool) => pool.length === 0)) {
        setTeamCombos([]);
        setComboError("팀원별 주력 캐릭터 표본이 부족해 조합을 계산할 수 없습니다.");
        setIsComboLoading(false);
        return;
      }

      setIsComboLoading(true);
      setComboError(null);

      try {
        const recommendations = await fetchTeamCombos(pools);
        if (cancelled) return;

        setTeamCombos(recommendations.results);
        setComboError(
          recommendations.results.length === 0 ? "조건에 맞는 조합 실험실 표본이 없습니다." : null
        );
      } catch {
        if (!cancelled) {
          setTeamCombos([]);
          setComboError("팀 조합 데이터를 불러오지 못했습니다.");
        }
      } finally {
        if (!cancelled) setIsComboLoading(false);
      }
    }

    void loadTeamRecommendations();

    return () => {
      cancelled = true;
    };
  }, [data]);

  async function handleMySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!myNickname.trim()) {
      setError("내 닉네임을 입력해주세요.");
      setMyProfile(null);
      setData(null);
      setTeamCombos([]);
      return;
    }

    setIsMyLoading(true);
    setError(null);
    setComboError(null);

    try {
      const payload = await fetchPlayers([myNickname.trim()]);
      const profile = payload.results[0] ?? null;
      if (!profile || profile.status !== "ok") {
        throw new Error("내 시즌 39 랭크 정보를 찾지 못했습니다.");
      }

      setMyProfile(profile);
      setData(null);
      setTeamCombos([]);
      setTeammateCharacterFilters([null, null]);
      setMyWeaponFilters(buildDefaultWeaponFilters(profile));
    } catch (err) {
      setMyProfile(null);
      setData(null);
      setTeamCombos([]);
      setTeammateCharacterFilters([null, null]);
      setMyWeaponFilters({});
      setError(err instanceof Error ? err.message : "내 정보 검색에 실패했습니다.");
    } finally {
      setIsMyLoading(false);
    }
  }

  async function handleTeamSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!myProfile || myProfile.status !== "ok") {
      setError("먼저 내 정보를 검색해주세요.");
      return;
    }
    if (teammateNicknames.length < 2) {
      setError("팀원 닉네임 2명을 모두 입력해주세요.");
      setData(null);
      setTeamCombos([]);
      setTeammateCharacterFilters([null, null]);
      return;
    }
    if (hasDuplicateNicknames([myProfile.nickname ?? myProfile.input, ...teammateNicknames])) {
      setError("내 닉네임과 팀원 닉네임은 서로 달라야 합니다.");
      setData(null);
      setTeamCombos([]);
      setTeammateCharacterFilters([null, null]);
      return;
    }

    setIsTeamLoading(true);
    setError(null);

    try {
      const teammateData = await fetchPlayers(teammateNicknames);
      setData({
        ...teammateData,
        results: [myProfile, ...teammateData.results],
      });
    } catch (err) {
      setData(null);
      setTeamCombos([]);
      setTeammateCharacterFilters([null, null]);
      setError(err instanceof Error ? err.message : "멀티서치 요청에 실패했습니다.");
    } finally {
      setIsTeamLoading(false);
    }
  }

  function updateMyWeaponFilter(characterCode: number, weaponCode: number) {
    setMyWeaponFilters((current) => {
      const next = { ...current };
      if (weaponCode > 0) next[characterCode] = weaponCode;
      else delete next[characterCode];
      return next;
    });
  }

  function toggleTeammateCharacterFilter(teammateIndex: number, characterCode: number) {
    setTeammateCharacterFilters((current) =>
      current.map((selected, index) =>
        index === teammateIndex ? (selected === characterCode ? null : characterCode) : selected
      )
    );
  }

  function updateTeammateInput(index: number, value: string) {
    setTeammateInputs((current) => {
      const split = splitNicknameInput(value);
      if (split.length > 1) {
        const next: [string, string] = [current[0], current[1]];
        next[index] = split[0] ?? "";
        if (index === 0) next[1] = split[1] ?? next[1];
        return next;
      }

      const next: [string, string] = [current[0], current[1]];
      next[index] = value;
      return next;
    });
    setData(null);
    setTeamCombos([]);
    setComboError(null);
    setTeammateCharacterFilters([null, null]);
  }

  return (
    <div className="flex flex-col gap-5">
      <form
        onSubmit={handleMySubmit}
        className="rounded-md border border-[var(--color-border)] bg-white p-3 sm:p-4"
      >
        <div className="grid gap-2 lg:grid-cols-[minmax(180px,0.45fr)_auto]">
          <label className="min-w-0">
            <span className="sr-only">내 닉네임</span>
            <input
              value={myNickname}
              onChange={(event) => setMyNickname(event.target.value)}
              maxLength={16}
              autoComplete="nickname"
              placeholder="내 닉네임"
              className="h-10 w-full min-w-0 rounded-md border border-[var(--color-border)] bg-white px-3 text-sm font-medium text-[var(--color-foreground)] outline-none focus:border-[var(--color-border-light)]"
            />
          </label>
          <Button type="submit" size="lg" disabled={isMyLoading} className="h-10 md:min-w-28">
            {isMyLoading ? <Loader2 className="h-4 w-4" /> : <Search className="h-4 w-4" />}내 정보
            검색
          </Button>
        </div>
        {error && !myProfile && (
          <div className="mt-4 flex items-start gap-2 rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-danger)]">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </form>

      {myProfile && (
        <MyProfileSetupCard
          result={myProfile}
          weaponFilters={myWeaponFilters}
          onWeaponChange={updateMyWeaponFilter}
          getCharacterName={(code) => characterNames.get(code) ?? `#${code}`}
        />
      )}

      <form
        onSubmit={handleTeamSubmit}
        className="rounded-md border border-[var(--color-border)] bg-white p-3 sm:p-4"
      >
        <div className="grid gap-2 lg:grid-cols-[1fr_1fr_auto]">
          {[0, 1].map((index) => (
            <label key={index} className="min-w-0">
              <span className="sr-only">팀원 {index + 1} 닉네임</span>
              <input
                value={teammateInputs[index]}
                onChange={(event) => updateTeammateInput(index, event.target.value)}
                autoComplete="off"
                placeholder={`팀원 ${index + 1} 닉네임`}
                className="h-10 w-full min-w-0 rounded-md border border-[var(--color-border)] bg-white px-3 text-sm font-medium text-[var(--color-foreground)] outline-none focus:border-[var(--color-border-light)]"
              />
            </label>
          ))}
          <Button
            type="submit"
            size="lg"
            disabled={isTeamLoading || !myProfile || teammateNicknames.length < 2}
            className="h-10 md:min-w-24"
          >
            {isTeamLoading ? <Loader2 className="h-4 w-4" /> : <Search className="h-4 w-4" />}
            팀원 검색
          </Button>
        </div>
        {error && myProfile && (
          <div className="mt-4 flex items-start gap-2 rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-danger)]">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </form>

      {data && (
        <section className="flex flex-col gap-3">
          {searchSummary && <SearchSummary summary={searchSummary} />}
          <div className="grid gap-3 lg:grid-cols-3">
            {data.results.map((result, index) => (
              <PlayerCard
                key={`${index}-${result.input}`}
                result={result}
                selectedCharacter={index > 0 ? (teammateCharacterFilters[index - 1] ?? null) : null}
                onToggleCharacter={
                  index > 0
                    ? (characterCode) => toggleTeammateCharacterFilter(index - 1, characterCode)
                    : undefined
                }
                getCharacterName={(code) => characterNames.get(code) ?? `#${code}`}
              />
            ))}
          </div>
        </section>
      )}

      {data && (
        <TeamComboRecommendations
          combos={teamCombos}
          players={data.results}
          myWeaponFilters={myWeaponFilters}
          teammateCharacterFilters={teammateCharacterFilters}
          loading={isComboLoading}
          error={comboError}
        />
      )}
    </div>
  );
}

function PlayerCard({
  result,
  selectedCharacter,
  onToggleCharacter,
  getCharacterName,
}: {
  result: PlayerResult;
  selectedCharacter: number | null;
  onToggleCharacter?: (characterCode: number) => void;
  getCharacterName: (code: number) => string;
}) {
  if (result.status !== "ok") {
    return (
      <Card>
        <CardContent className="flex h-full flex-col gap-3 p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded border border-[var(--color-border)] bg-white text-[var(--color-danger)]">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-[var(--color-foreground)]">
                {result.input}
              </p>
              <p className="text-xs font-semibold text-[var(--color-muted-foreground)]">
                {playerStatusText(result)}
              </p>
            </div>
          </div>
          <p className="text-xs leading-5 text-[var(--color-muted-foreground)]">
            {playerStatusDescription(result)}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="flex flex-col gap-3 p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-base font-bold text-[var(--color-foreground)]">
              {result.nickname}
            </p>
            <p className="text-xs font-semibold text-[var(--color-muted-foreground)]">
              #{formatNumber(result.rank)} · MMR {formatNumber(result.mmr)}
            </p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded border border-[var(--color-border)] bg-white text-[var(--color-muted-foreground)]">
            <Trophy className="h-4 w-4" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Metric label="승률" value={`${formatNumber(result.winRate)}%`} />
          <Metric label="순방률" value={`${formatNumber(result.top3Rate)}%`} />
          <Metric label="평균 킬" value={formatNumber(result.averageKills)} />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-[11px] font-semibold text-[var(--color-muted-foreground)]">
            <Users className="h-3.5 w-3.5" />
            주력 캐릭터
          </div>
          <div className="grid gap-2">
            {(result.topCharacters ?? []).slice(0, TOP_CHARACTER_LIMIT).map((character) => {
              return (
                <div
                  key={character.characterCode}
                  className={cn(
                    "grid gap-2 rounded-md border px-2.5 py-1.5",
                    "grid-cols-[1fr_auto]",
                    selectedCharacter === character.characterCode
                      ? "border-[var(--color-border-light)] bg-white"
                      : "border-[var(--color-border)] bg-white",
                    onToggleCharacter &&
                      "hover:border-[var(--color-border-light)] hover:bg-[var(--color-surface-2)]"
                  )}
                >
                  <button
                    type="button"
                    disabled={!onToggleCharacter}
                    onClick={() => onToggleCharacter?.(character.characterCode)}
                    className="min-w-0 text-left disabled:cursor-default"
                  >
                    <p className="truncate text-xs font-bold text-[var(--color-foreground)]">
                      {getCharacterName(character.characterCode)}
                    </p>
                    <p className="text-[11px] text-[var(--color-muted-foreground)]">
                      {character.totalGames}게임 · 승률 {formatNumber(character.winRate)}%
                    </p>
                  </button>
                  <button
                    type="button"
                    disabled={!onToggleCharacter}
                    onClick={() => onToggleCharacter?.(character.characterCode)}
                    className={cn(
                      "text-right text-xs font-semibold",
                      character.top3Rate >= 50
                        ? "text-[var(--color-stat-up)]"
                        : "text-[var(--color-muted-foreground)]"
                    )}
                  >
                    T3 {formatNumber(character.top3Rate)}%
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface SearchSummaryState {
  okCount: number;
  failed: PlayerResult[];
}

function buildSearchSummary(results: PlayerResult[]): SearchSummaryState | null {
  if (results.length === 0) return null;
  const failed = results.filter((result) => result.status !== "ok");
  if (failed.length === 0) return null;

  return {
    okCount: results.length - failed.length,
    failed,
  };
}

function SearchSummary({ summary }: { summary: SearchSummaryState }) {
  return (
    <div className="flex flex-col gap-2 rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-foreground)]">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-accent-gold)]" />
        <div className="min-w-0">
          <p className="font-bold">일부 플레이어 정보를 불러오지 못했습니다.</p>
          <p className="mt-0.5 text-xs leading-5 text-[var(--color-muted-foreground)]">
            성공 {summary.okCount}명 · 실패 {summary.failed.length}명. 세 명 모두 시즌 기록이
            확인되어야 조합 지표를 계산합니다.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {summary.failed.map((result) => (
          <span
            key={result.input}
            className="inline-flex items-center gap-1 rounded border border-[var(--color-border)] bg-white px-2 py-1 text-xs font-semibold text-[var(--color-muted-foreground)]"
          >
            <span className="max-w-32 truncate text-[var(--color-foreground)]">{result.input}</span>
            <span>{playerStatusText(result)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function MyProfileSetupCard({
  result,
  weaponFilters,
  onWeaponChange,
  getCharacterName,
}: {
  result: PlayerResult;
  weaponFilters: Record<number, number>;
  onWeaponChange: (characterCode: number, weaponCode: number) => void;
  getCharacterName: (code: number) => string;
}) {
  if (result.status !== "ok") return null;

  return (
    <Card className="overflow-hidden border-[var(--color-border)]">
      <CardContent className="flex flex-col gap-3 p-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[var(--color-muted-foreground)]">
              내 캐릭터 정보
            </p>
            <h2 className="mt-1 truncate text-lg font-bold text-[var(--color-foreground)]">
              {result.nickname}
            </h2>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <Metric label="승률" value={`${formatNumber(result.winRate)}%`} />
            <Metric label="순방률" value={`${formatNumber(result.top3Rate)}%`} />
            <Metric label="평균 킬" value={formatNumber(result.averageKills)} />
          </div>
        </div>

        <div className="grid gap-2 lg:grid-cols-3">
          {(result.topCharacters ?? []).slice(0, TOP_CHARACTER_LIMIT).map((character) => {
            const weaponOptions = getCharacterWeaponOptions(character.characterCode);
            return (
              <div
                key={character.characterCode}
                className="grid gap-2 rounded-md border border-[var(--color-border)] bg-white p-2.5"
              >
                <div className="grid grid-cols-[36px_1fr] items-center gap-2">
                  <div className="relative h-9 w-9 overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)]">
                    <Image
                      src={getCharacterMiniWebpUrl(character.characterCode)}
                      alt={getCharacterName(character.characterCode)}
                      fill
                      sizes="36px"
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[var(--color-foreground)]">
                      {getCharacterName(character.characterCode)}
                    </p>
                    <p className="truncate text-xs text-[var(--color-muted-foreground)]">
                      {character.totalGames}게임 · 승률 {formatNumber(character.winRate)}%
                    </p>
                  </div>
                </div>
                <select
                  value={weaponFilters[character.characterCode] ?? 0}
                  onChange={(event) =>
                    onWeaponChange(character.characterCode, Number(event.target.value))
                  }
                  className="h-9 rounded-md border border-[var(--color-border)] bg-white px-2 text-xs font-semibold text-[var(--color-foreground)] outline-none"
                  aria-label={`${getCharacterName(character.characterCode)} 무기군`}
                >
                  <option value={0}>전체 무기</option>
                  {weaponOptions.map((weapon) => (
                    <option key={weapon.weaponCode} value={weapon.weaponCode}>
                      {weapon.label}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
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
    <div className="rounded-md border border-[var(--color-border)] bg-white px-2 py-1.5">
      <p className="text-[11px] font-semibold text-[var(--color-muted-foreground)]">{label}</p>
      <p
        className={cn(
          "mt-1 truncate font-bold text-[var(--color-foreground)]",
          strong ? "text-lg" : "text-base"
        )}
      >
        {value}
      </p>
    </div>
  );
}

function playerStatusText(result: PlayerResult) {
  if (result.status === "not_found") return "닉네임을 찾을 수 없습니다.";
  if (result.status === "no_stats") return "시즌 통계가 없습니다.";
  if (result.reason === "bser_api_key_missing") return "API 설정이 필요합니다.";
  if (result.reason === "bser_api_unavailable") return "전적 API가 응답하지 않습니다.";
  return "검색 중 오류가 발생했습니다.";
}

function playerStatusDescription(result: PlayerResult) {
  if (result.reason === "bser_api_key_missing") {
    return "서버의 BSER API 키 설정을 확인해야 합니다.";
  }
  if (result.reason === "bser_api_unavailable") {
    return "외부 전적 API 지연 또는 장애로 조회하지 못했습니다. 잠시 뒤 다시 시도해주세요.";
  }
  return "닉네임 또는 시즌 39 랭크 기록을 확인해주세요.";
}

function formatNumber(value: number | undefined) {
  if (value == null || Number.isNaN(value)) return "-";
  return new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 2 }).format(value);
}

function splitNicknameInput(value: string): string[] {
  return value
    .split(/[,\n]/)
    .map((nickname) => nickname.trim())
    .filter(Boolean)
    .slice(0, 2);
}

function buildTeammateNicknames(inputs: [string, string]): string[] {
  return inputs.map((nickname) => nickname.trim()).filter(Boolean);
}

function hasDuplicateNicknames(nicknames: string[]): boolean {
  const seen = new Set<string>();
  for (const nickname of nicknames) {
    const key = nickname.trim().toLocaleLowerCase("ko-KR");
    if (!key) continue;
    if (seen.has(key)) return true;
    seen.add(key);
  }
  return false;
}

function getTopCharacterCodes(player: PlayerResult): number[] {
  return Array.from(
    new Set(
      (player.topCharacters ?? [])
        .slice(0, TOP_CHARACTER_LIMIT)
        .map((character) => character.characterCode)
        .filter((code) => Number.isFinite(code) && code > 0)
    )
  );
}

function buildDefaultWeaponFilters(player: PlayerResult): Record<number, number> {
  return Object.fromEntries(
    getTopCharacterCodes(player)
      .map((characterCode) => {
        const options = getCharacterWeaponOptions(characterCode);
        const weapon = options.find((option) => option.isDefault) ?? options[0];
        return weapon ? [characterCode, weapon.weaponCode] : null;
      })
      .filter((entry): entry is [number, number] => entry != null)
  );
}

async function fetchPlayers(nicknames: string[]): Promise<MultiSearchResponse> {
  const response = await fetch("/api/multi-search/players", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nicknames }),
  });

  const payload = await response.json();
  if (!response.ok) {
    const message = Array.isArray(payload?.message)
      ? payload.message.join(" ")
      : payload?.message || "멀티서치 요청에 실패했습니다.";
    throw new Error(message);
  }

  return payload as MultiSearchResponse;
}

async function fetchTeamCombos(pools: number[][]): Promise<TeamCombosResponse> {
  const response = await fetch("/api/multi-search/team-combos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pools }),
    cache: "no-store",
  });

  if (!response.ok) throw new Error("team_combo_failed");

  const payload = (await response.json()) as Partial<TeamCombosResponse>;
  return {
    results: payload.results ?? [],
  };
}

function comboDetailHref(combo: TrioWeaponCombo): string {
  const pool = combo.members.map((member) => member.character);
  const weaponFilters = Object.fromEntries(
    combo.members.map((member) => [member.character, member.weapon])
  ) as Record<number, number>;

  return buildTrioLabDetailHref(combo.id, {
    pool,
    weaponFilters,
    sort: "recommended",
    search: "",
  });
}

function memberDisplayName(member: TrioWeaponCombo["members"][number]): string {
  return `${characterDisplayName(member.character)} ${weaponDisplayName(member.weapon)}`;
}

function TeamComboRecommendations({
  combos,
  players,
  myWeaponFilters,
  teammateCharacterFilters,
  loading,
  error,
}: {
  combos: TrioWeaponCombo[];
  players: PlayerResult[];
  myWeaponFilters: Record<number, number>;
  teammateCharacterFilters: Array<number | null>;
  loading: boolean;
  error: string | null;
}) {
  const okPlayers = players.filter((player) => player.status === "ok");
  const failedPlayers = players.filter((player) => player.status !== "ok");
  const isReady = okPlayers.length === 3;
  const activeWeaponFilterCount = Object.keys(myWeaponFilters).length;
  const recommendedCombos = useMemo(
    () =>
      buildBestCombosByTeammatePicks(combos, players, myWeaponFilters, teammateCharacterFilters),
    [combos, players, myWeaponFilters, teammateCharacterFilters]
  );
  const recommendationTitle =
    activeWeaponFilterCount > 0
      ? "팀원 후보 조합별 내 픽 지표"
      : "팀원 후보군에 맞는 내 캐릭터/무기";

  return (
    <section className="flex flex-col gap-3 rounded-md border border-[var(--color-border)] bg-white p-3 sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-muted-foreground)]">
            <Swords className="h-4 w-4" />내 픽 지표
          </div>
          <h2 className="mt-1 text-lg font-bold text-[var(--color-foreground)]">
            {recommendationTitle}
          </h2>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-[var(--color-muted-foreground)]">
            팀원 2명의 주력 캐릭터 후보 조합마다 내 캐릭터/무기군 조건의 RP 표본을 하나씩 표시하고,
            조합을 RP 기준으로 정렬합니다.
          </p>
        </div>
        {loading && (
          <span className="inline-flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-xs font-semibold text-[var(--color-muted-foreground)]">
            <Loader2 className="h-4 w-4" />
            지표 계산 중
          </span>
        )}
      </div>

      {!isReady && (
        <div className="flex items-start gap-2 rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-muted-foreground)]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-accent-gold)]" />
          <span>
            현재 검색 성공 {okPlayers.length}명입니다.{" "}
            {failedPlayers.length > 0
              ? `${failedPlayers.map((player) => player.input).join(", ")} 정보를 확인한 뒤 다시 검색해주세요.`
              : "세 명의 시즌 기록이 모두 필요합니다."}
          </span>
        </div>
      )}

      {isReady && error && !loading && (
        <div className="flex items-start gap-2 rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-danger)]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {isReady && !loading && !error && recommendedCombos.length === 0 && combos.length > 0 && (
        <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm text-[var(--color-muted-foreground)]">
          설정한 캐릭터별 무기군과 맞는 표본이 없습니다.
        </div>
      )}

      {isReady && !loading && !error && recommendedCombos.length > 0 && (
        <div className="grid gap-2 lg:grid-cols-3">
          {recommendedCombos.map((recommendation, index) => (
            <MyPickComboCard
              key={recommendation.key}
              recommendation={recommendation}
              rank={index + 1}
            />
          ))}
        </div>
      )}
    </section>
  );
}

type OrderedComboMembers = [
  TrioWeaponCombo["members"][number],
  TrioWeaponCombo["members"][number],
  TrioWeaponCombo["members"][number],
];

interface OrderedComboRecommendation {
  key: string;
  myMember: TrioWeaponCombo["members"][number];
  combos: Array<{
    combo: TrioWeaponCombo;
    members: OrderedComboMembers;
  }>;
}

function buildBestCombosByTeammatePicks(
  combos: TrioWeaponCombo[],
  players: PlayerResult[],
  myWeaponFilters: Record<number, number>,
  teammateCharacterFilters: Array<number | null>
): OrderedComboRecommendation[] {
  const pools = players.map((player) => getTopCharacterCodes(player));
  if (pools.length !== 3 || pools.some((pool) => pool.length === 0)) return [];

  const bestByTeammatePick = new Map<
    string,
    {
      combo: TrioWeaponCombo;
      members: OrderedComboMembers;
    }
  >();

  for (const combo of combos) {
    const members = orderComboMembersByPlayerPools(combo, pools);
    if (!members) continue;

    const myMember = members[0];
    const selectedWeapon = myWeaponFilters[myMember.character];
    if (selectedWeapon > 0 && myMember.weapon !== selectedWeapon) continue;
    if (
      teammateCharacterFilters[0] != null &&
      members[1].character !== teammateCharacterFilters[0]
    ) {
      continue;
    }
    if (
      teammateCharacterFilters[1] != null &&
      members[2].character !== teammateCharacterFilters[1]
    ) {
      continue;
    }

    const teammateKey = members
      .slice(1)
      .map((member) => `${member.character}:${member.weapon}`)
      .join("|");
    const current = bestByTeammatePick.get(teammateKey);

    if (
      !current ||
      combo.averageRP > current.combo.averageRP ||
      (combo.averageRP === current.combo.averageRP &&
        combo.totalGames > current.combo.totalGames) ||
      (combo.averageRP === current.combo.averageRP &&
        combo.totalGames === current.combo.totalGames &&
        combo.winRate > current.combo.winRate)
    ) {
      bestByTeammatePick.set(teammateKey, { combo, members });
    }
  }

  const byMyPick = new Map<string, OrderedComboRecommendation>();

  for (const entry of bestByTeammatePick.values()) {
    const myMember = entry.members[0];
    const key = `${myMember.character}:${myMember.weapon}`;
    const current: OrderedComboRecommendation = byMyPick.get(key) ?? {
      key,
      myMember,
      combos: [],
    };
    current.combos.push(entry);
    byMyPick.set(key, current);
  }

  return Array.from(byMyPick.values())
    .map((recommendation) => ({
      ...recommendation,
      combos: recommendation.combos.sort(
        (a, b) =>
          b.combo.averageRP - a.combo.averageRP ||
          b.combo.totalGames - a.combo.totalGames ||
          b.combo.winRate - a.combo.winRate
      ),
    }))
    .sort((a, b) => {
      const aBest = a.combos[0]?.combo;
      const bBest = b.combos[0]?.combo;
      if (!aBest && !bBest) return 0;
      if (!aBest) return 1;
      if (!bBest) return -1;
      return (
        bBest.averageRP - aBest.averageRP ||
        bBest.totalGames - aBest.totalGames ||
        bBest.winRate - aBest.winRate
      );
    });
}

function orderComboMembersByPlayerPools(
  combo: TrioWeaponCombo,
  pools: number[][]
): OrderedComboMembers | null {
  const selected: Array<TrioWeaponCombo["members"][number] | null> = Array(pools.length).fill(null);
  const usedIndexes = new Set<number>();

  function visit(playerIndex: number): boolean {
    if (playerIndex >= pools.length) return true;

    for (let memberIndex = 0; memberIndex < combo.members.length; memberIndex += 1) {
      if (usedIndexes.has(memberIndex)) continue;
      const member = combo.members[memberIndex];
      if (!pools[playerIndex].includes(member.character)) continue;

      selected[playerIndex] = member;
      usedIndexes.add(memberIndex);
      if (visit(playerIndex + 1)) return true;
      usedIndexes.delete(memberIndex);
      selected[playerIndex] = null;
    }

    return false;
  }

  if (!visit(0)) return null;
  return selected as OrderedComboMembers;
}

function MyPickComboCard({
  recommendation,
  rank,
}: {
  recommendation: OrderedComboRecommendation;
  rank: number;
}) {
  const pathname = usePathname();
  const { myMember, combos } = recommendation;
  const bestCombo = combos[0]?.combo;
  const tier = bestCombo
    ? comboTier(bestCombo.winRate, bestCombo.averageRP, bestCombo.averageRank, bestCombo.totalGames)
    : "D";

  return (
    <div className="flex min-h-[176px] flex-col gap-3 rounded-md border border-[var(--color-border)] bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded border border-[var(--color-border)] bg-[var(--color-surface-2)]">
            <Image
              src={getCharacterMiniWebpUrl(myMember.character)}
              alt={characterDisplayName(myMember.character)}
              fill
              sizes="48px"
              className="object-cover"
              unoptimized
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="inline-flex h-6 min-w-7 items-center justify-center rounded-md bg-[var(--color-surface-3)] px-1.5 font-mono text-[10px] font-bold text-[var(--color-muted-foreground)]">
                #{rank}
              </span>
              <span className="inline-flex h-6 min-w-7 items-center justify-center rounded-md border border-[var(--color-border)] bg-white px-1.5 font-mono text-xs font-bold text-[var(--color-foreground)]">
                {tier}
              </span>
            </div>
            <p className="mt-1 truncate text-sm font-bold text-[var(--color-foreground)]">
              {memberDisplayName(myMember)}
            </p>
            <p className="truncate text-xs font-semibold text-[var(--color-muted-foreground)]">
              내 픽 기준 RP 상위 팀원 조합
            </p>
          </div>
        </div>
        {bestCombo && (
          <span
            className={cn(
              "rounded border bg-white px-2 py-1 font-mono text-sm font-bold",
              bestCombo.averageRP >= 0
                ? "border-[var(--color-border)] text-[var(--color-stat-up)]"
                : "border-[var(--color-border)] text-[var(--color-stat-down)]"
            )}
          >
            {bestCombo.averageRP >= 0 ? "+" : ""}
            {bestCombo.averageRP.toFixed(1)}
          </span>
        )}
      </div>

      {bestCombo && (
        <div className="grid grid-cols-3 gap-1.5">
          <CompactMetric label="승률" value={`${bestCombo.winRate.toFixed(1)}%`} />
          <CompactMetric label="순위" value={`#${bestCombo.averageRank.toFixed(1)}`} />
          <CompactMetric label="표본" value={bestCombo.totalGames.toLocaleString("ko-KR")} />
        </div>
      )}

      <div className="mt-auto flex flex-col gap-1.5 border-t border-[var(--color-border)] pt-2">
        <p className="text-[10px] font-semibold text-[var(--color-muted-foreground)]">
          팀원 픽 순서
        </p>
        {combos.map(({ combo, members }) => (
          <Link
            key={combo.id}
            href={withCurrentRouteLocale(pathname, comboDetailHref(combo))}
            scroll={false}
            className="flex items-center justify-between gap-2 rounded border border-transparent bg-white px-2 py-1.5 text-[11px] hover:border-[var(--color-border)]"
          >
            <span className="min-w-0 truncate font-bold text-[var(--color-foreground)]">
              {members
                .slice(1)
                .map((member) => memberDisplayName(member))
                .join(" + ")}
            </span>
            <span className="shrink-0 font-mono font-bold text-[var(--color-stat-up)]">
              {combo.averageRP >= 0 ? "+" : ""}
              {combo.averageRP.toFixed(1)} RP
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function CompactMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md bg-white px-1 py-1">
      <p className="text-[9px] font-semibold text-[var(--color-muted-foreground)]">{label}</p>
      <p className="truncate font-mono text-[11px] font-bold text-[var(--color-foreground)]">
        {value}
      </p>
    </div>
  );
}
