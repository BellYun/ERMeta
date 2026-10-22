"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ADSENSE_SLOT_RESERVATIONS,
  ADSENSE_SLOTS,
  canRenderAdSlot,
} from "@/components/ads/adsenseConfig";
import { AdSlot } from "@/components/ads/AdSlot";
import { useL10n } from "@/components/L10nProvider";
import { getCharacterMiniWebpUrl, resolveCharacterName } from "@/lib/characterMap";
import {
  buildTeamAssignments,
  loadTeamMetrics,
  normalizePools,
  pickKey,
  sortTeamAssignments,
  type PoolPick,
  type TeamMetrics,
  type TeamPools,
  type TeamSort,
} from "@/lib/trioBuilder";
import { getWeaponGroupImageUrl, resolveWeaponName } from "@/lib/weaponMap";
import { getFallbackMap } from "../synergy/constants";
import { RecommendationNavigation } from "../synergy/RecommendationNavigation";
import { matchesChosungSearch } from "../synergy/utils";
import { getAllCharWeaponItems } from "../synergy-detail/WeaponAllySelector";
import styles from "./TrioBuilder.module.css";
import { TrioBuilderResultCard } from "./TrioBuilderResultCard";

const STORAGE_KEY = "ermeta:trio-builder:v1";
const ITEMS = getAllCharWeaponItems();
const PLAYERS = ["A", "B", "C"] as const;
const EMPTY: TeamPools = [[], [], []];
const PAGE_SIZE = 50;

function PickPortrait({ pick }: { pick: PoolPick }) {
  const icon = getWeaponGroupImageUrl(pick.weaponCode);
  return (
    <span className={styles.portrait}>
      <Image src={getCharacterMiniWebpUrl(pick.charCode)} alt="" width={36} height={36} />
      {icon && <Image className={styles.weapon} src={icon} alt="" width={18} height={18} />}
    </span>
  );
}

function PoolEditor({
  player,
  pool,
  onChange,
}: {
  player: string;
  pool: PoolPick[];
  onChange: (pool: PoolPick[]) => void;
}) {
  const t = useTranslations("trioBuilder");
  const { l10n } = useL10n();
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(false);
  const name = (p: PoolPick) => resolveCharacterName(p.charCode, l10n, getFallbackMap());
  const label = (p: PoolPick) =>
    `${name(p)}${p.weaponCode ? ` · ${resolveWeaponName(p.weaponCode, l10n)}` : ""}`;
  const selected = new Set(pool.map(pickKey));
  const filtered = ITEMS.filter(
    (p) =>
      matchesChosungSearch(name(p), search.trim()) ||
      label(p).toLowerCase().includes(search.trim().toLowerCase())
  );
  const toggle = (pick: PoolPick) =>
    onChange(
      selected.has(pickKey(pick))
        ? pool.filter((p) => pickKey(p) !== pickKey(pick))
        : [...pool, { charCode: pick.charCode, weaponCode: pick.weaponCode }]
    );
  return (
    <section className={`dashboard-panel ${styles.pool}`} aria-label={t("player", { player })}>
      <div className={styles.poolHeading}>
        <h2>
          {t("player", { player })} <span>{pool.length}</span>
        </h2>
        <button type="button" onClick={() => onChange([])} disabled={!pool.length}>
          {t("clear")}
        </button>
      </div>
      <div className={styles.chips}>
        {pool.length ? (
          pool.map((p) => (
            <button
              key={pickKey(p)}
              type="button"
              onClick={() => toggle(p)}
              aria-label={t("remove", { name: label(p) })}
            >
              <PickPortrait pick={p} />
              <span>{label(p)}</span>
              <span aria-hidden>×</span>
            </button>
          ))
        ) : (
          <p>{t("emptyPool")}</p>
        )}
      </div>
      <button
        type="button"
        className={styles.editButton}
        aria-expanded={expanded}
        onClick={() => setExpanded(!expanded)}
      >
        {t(expanded ? "close" : "edit")}
      </button>
      {expanded && (
        <div>
          <input
            className={styles.search}
            aria-label={t("search", { player })}
            placeholder={t("search", { player })}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className={styles.picker}>
            {filtered.map((p) => (
              <button
                type="button"
                key={pickKey(p)}
                aria-pressed={selected.has(pickKey(p))}
                aria-label={label(p)}
                onClick={() => toggle(p)}
              >
                <PickPortrait pick={p} />
                <span>{name(p)}</span>
                <small>{p.weaponCode ? resolveWeaponName(p.weaponCode, l10n) : "—"}</small>
              </button>
            ))}
          </div>
          {!filtered.length && <p>{t("noSearch")}</p>}
        </div>
      )}
    </section>
  );
}

export function TrioBuilder() {
  const t = useTranslations("trioBuilder");
  const [pools, setPools] = useState<TeamPools>(EMPTY);
  const [ready, setReady] = useState(false);
  const [result, setResult] = useState<{
    pools: TeamPools;
    metrics: Map<string, TeamMetrics>;
  } | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [sort, setSort] = useState<TeamSort>("averageRP");
  const [page, setPage] = useState(0);
  const [copied, setCopied] = useState(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        const query = new URLSearchParams(window.location.search).get("pools");
        const saved = query ?? localStorage.getItem(STORAGE_KEY);
        if (saved) setPools(normalizePools(JSON.parse(saved), ITEMS));
      } catch {
        /* Invalid or unavailable storage leaves editable empty pools. */
      }
      setReady(true);
    });
    return () => {
      cancelAnimationFrame(frame);
      controller.current?.abort();
    };
  }, []);
  const update = (index: number, pool: PoolPick[]) => {
    controller.current?.abort();
    const next = pools.map((p, i) => (i === index ? pool : p)) as TeamPools;
    setPools(next);
    setResult(null);
    setStatus("idle");
    setPage(0);
    setCopied(false);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* Storage may be disabled. */
    }
    const url = new URL(window.location.href);
    url.searchParams.delete("pools");
    window.history.replaceState(null, "", url);
  };
  const generate = async () => {
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    setStatus("loading");
    setResult(null);
    setPage(0);
    try {
      const metrics = await loadTeamMetrics(pools, request.signal);
      if (!request.signal.aborted) {
        setResult({ pools, metrics });
        setStatus("idle");
      }
    } catch {
      if (!request.signal.aborted) {
        request.abort();
        setStatus("error");
      }
    }
  };
  const rows = useMemo(
    () =>
      result ? sortTeamAssignments(buildTeamAssignments(result.pools, result.metrics), sort) : [],
    [result, sort]
  );
  const recorded = useMemo(() => rows.filter((r) => r.metrics).length, [rows]);
  const pages = Math.ceil(rows.length / PAGE_SIZE);
  const share = async () => {
    const url = new URL(window.location.href);
    url.searchParams.set("pools", JSON.stringify(pools));
    try {
      await navigator.clipboard.writeText(url.toString());
      setCopied(true);
    } catch {
      setCopied(false);
      window.prompt(t("copyLink"), url.toString());
    }
  };
  return (
    <div className={`page-shell composition-studio flex flex-col gap-5 ${styles.shell}`}>
      <RecommendationNavigation active="trio" />
      <section className={`composition-studio__intro ${styles.intro}`}>
        <h1 className="dashboard-section-title text-2xl font-bold">{t("title")}</h1>
        <p>{t("description")}</p>
        <p className={styles.note}>{t("rules")}</p>
      </section>
      {canRenderAdSlot(ADSENSE_SLOTS.synergyDetail) ? (
        <AdSlot
          slot={ADSENSE_SLOTS.synergyDetail}
          slotName="trio_builder_top"
          className="dashboard-panel px-3 py-2.5 sm:px-4"
          reservation={ADSENSE_SLOT_RESERVATIONS.contentHorizontal}
        />
      ) : null}
      <div className={styles.pools}>
        {PLAYERS.map((player, i) => (
          <PoolEditor
            key={player}
            player={player}
            pool={pools[i]!}
            onChange={(p) => update(i, p)}
          />
        ))}
      </div>
      <div className={styles.actions}>
        <button
          className={styles.primary}
          type="button"
          disabled={!ready || pools.some((p) => !p.length) || status === "loading"}
          onClick={generate}
        >
          {t(status === "loading" ? "loading" : "generate")}
        </button>
        <button type="button" disabled={pools.every((p) => !p.length)} onClick={share}>
          {t(copied ? "copied" : "share")}
        </button>
        <span>{t("saved")}</span>
      </div>
      <div className={styles.status} data-state={status} role="status" aria-live="polite">
        {status === "error"
          ? t("error")
          : status === "loading"
            ? t("loading")
            : !result
              ? t("start")
              : t("count", { count: rows.length, recorded })}
      </div>
      {result && (
        <section className={`dashboard-panel ${styles.results}`} aria-label={t("results")}>
          <div className={styles.toolbar}>
            <h2>{t("results")}</h2>
            <label>
              {t("sort")}{" "}
              <select
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value as TeamSort);
                  setPage(0);
                }}
              >
                {(["averageRP", "winRate", "totalGames", "averageRank"] as const).map((key) => (
                  <option key={key} value={key}>
                    {t(key)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className={styles.note}>{t("source")}</p>
          {!rows.length ? (
            <p>{t("noCombinations")}</p>
          ) : (
            <>
              <div className={styles.comparison}>
                <div
                  className="composition-comparison-scroll"
                  data-sort-by={sort}
                  role="region"
                  aria-label={t("results")}
                  tabIndex={0}
                >
                  <div className="composition-comparison-heading">
                    <span className="composition-comparison-heading__identity">A · B · C</span>
                    {(["winRate", "averageRP", "totalGames", "averageRank"] as const).map((key) => (
                      <button
                        key={key}
                        type="button"
                        aria-pressed={sort === key}
                        data-active={sort === key || undefined}
                        onClick={() => {
                          setSort(key);
                          setPage(0);
                        }}
                      >
                        {t(key)}
                      </button>
                    ))}
                  </div>
                  {rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((row, i) => (
                    <TrioBuilderResultCard
                      key={row.key}
                      row={row}
                      rank={page * PAGE_SIZE + i + 1}
                    />
                  ))}
                </div>
              </div>
              <div className={styles.pagination}>
                <button type="button" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                  {t("previous")}
                </button>
                <span>
                  {page + 1} / {pages}
                </span>
                <button
                  type="button"
                  disabled={page + 1 >= pages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  {t("next")}
                </button>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
