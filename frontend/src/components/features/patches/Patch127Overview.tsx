import { Gem } from "lucide-react";
import Image from "next/image";
import itemImages from "@/../const/itemImageMap.json";
import {
  COMMON_CHANGES,
  FEATURED_EQUIPMENT,
  FIXES,
  PATCH_12_7_SOURCE,
  QUALITY_CHANGES,
  type EquipmentChange,
} from "@/data/12.7-overview";
import { ChangeTypeBadgeStatic } from "./ChangeTypeBadgeStatic";

const heading =
  "text-xl font-bold tracking-tight text-[var(--color-foreground)] [overflow-wrap:anywhere]";
const muted = "text-sm leading-6 text-[var(--color-muted-foreground)]";
const section = "min-w-0 scroll-mt-24 space-y-5 border-t border-[var(--color-border)] pt-6";

function Equipment({ item }: { item: EquipmentChange }) {
  const path = (itemImages as Record<string, string>)[item.code];
  return (
    <article className="min-w-0 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <div className="flex min-w-0 items-center gap-3">
        {path ? (
          <Image
            src={path.split("/").map(encodeURIComponent).join("/")}
            alt=""
            width={56}
            height={56}
            className="h-14 w-14 shrink-0 rounded-md bg-[var(--color-surface-2)] object-contain"
          />
        ) : (
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-[var(--color-surface-2)] text-[var(--color-muted-foreground)]"
            aria-label="아이템 이미지 없음"
          >
            <Gem aria-hidden="true" size={24} />
          </div>
        )}
        <div className="min-w-0">
          <h3 className="font-bold [overflow-wrap:anywhere]">{item.name}</h3>
          <div className="mt-1">
            <ChangeTypeBadgeStatic type={item.direction} label="상향" />
          </div>
        </div>
      </div>
      <ul className="mt-4 space-y-2 text-sm leading-6 [overflow-wrap:anywhere]">
        {item.changes.map((value) => (
          <li key={value}>{value}</li>
        ))}
      </ul>
      {item.note && <p className={`mt-3 ${muted}`}>{item.note}</p>}
    </article>
  );
}

export function Patch127Intro() {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <p className="text-[var(--color-muted-foreground)]">
          2026.10.29 · 정기 점검 11:00–15:00 KST · 루미아 섬 중심
        </p>
        <a
          href={PATCH_12_7_SOURCE}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center font-semibold text-[var(--color-accent-foreground)] underline underline-offset-4"
        >
          공식 패치노트 ↗
        </a>
      </div>
      <p className="max-w-3xl text-lg leading-8 text-[var(--color-foreground)]">
        실험체 26명과 장비 2종의 조정, 갬빗 잠금과 랭크 규칙 변경을 한곳에서 확인하세요.
      </p>
      <p className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-3 text-sm leading-6 text-[var(--color-muted-foreground)]">
        12.7 랭크 통계는 표본 기준을 채우면 순위에 반영됩니다. 그전에는 12.6 통계를 기준으로
        표시합니다. 아래 전망은 12.6 사전 지표를 사용하며 12.7 관측 결과가 아닙니다.
      </p>
      <nav aria-label="12.7 패치 목차" className="flex flex-wrap gap-2">
        {[
          ["equipment", "장비"],
          ["common", "전술 스킬"],
          ["characters", "실험체"],
          ["quality", "게임·편의"],
          ["rank", "랭크·이벤트"],
        ].map(([id, label]) => (
          <a
            key={id}
            href={`#patch-${id}`}
            className="inline-flex min-h-11 items-center rounded-md border border-[var(--color-border)] px-4 text-sm font-semibold hover:bg-[var(--color-surface-2)] focus-visible:outline-2 focus-visible:outline-[var(--color-focus)]"
          >
            {label}
          </a>
        ))}
      </nav>
      <section id="patch-equipment" className={section}>
        <div>
          <p className="dashboard-kicker">EQUIPMENT</p>
          <h2 className={`mt-2 ${heading}`}>장비 변경</h2>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-[repeat(2,minmax(0,1fr))]">
          {FEATURED_EQUIPMENT.map((item) => (
            <Equipment key={item.code} item={item} />
          ))}
        </div>
      </section>
      <section id="patch-common" className={section}>
        <h2 className={heading}>전술 스킬</h2>
        <div className="divide-y divide-[var(--color-border)]">
          {COMMON_CHANGES.map((item) => (
            <div
              key={item.name}
              className="grid min-w-0 gap-2 py-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]"
            >
              <div>
                <p className="text-xs text-[var(--color-muted-foreground)]">{item.type}</p>
                <h3 className="mt-1 font-semibold">{item.name}</h3>
              </div>
              <p className="text-sm leading-6 [overflow-wrap:anywhere]">{item.value}</p>
            </div>
          ))}
        </div>
      </section>
      <div id="patch-characters" className={section}>
        <h2 className={heading}>실험체 변경</h2>
        <p className={muted}>
          변경된 수치·계수만 표시합니다. 이름 검색과 상향·하향 필터로 찾아보세요.
        </p>
      </div>
    </>
  );
}

export function Patch127Extras() {
  return (
    <>
      <section id="patch-quality" className={section}>
        <div>
          <p className="dashboard-kicker">PLAY & QUALITY OF LIFE</p>
          <h2 className={`mt-2 ${heading}`}>게임·편의 변경</h2>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-x-8 md:grid-cols-[repeat(2,minmax(0,1fr))]">
          {QUALITY_CHANGES.map((item) => (
            <article key={item.title} className="border-b border-[var(--color-border)] py-5">
              <h3 className="font-semibold">{item.title}</h3>
              <p className={`mt-2 ${muted}`}>{item.text}</p>
            </article>
          ))}
        </div>
        <details className="rounded-xl bg-[var(--color-surface-2)] p-5">
          <summary className="cursor-pointer font-semibold focus-visible:outline-2 focus-visible:outline-[var(--color-focus)]">
            전투·플레이 관련 버그 수정
          </summary>
          <ul className="mt-4 space-y-3 text-sm leading-6">
            {FIXES.map((fix) => (
              <li key={fix}>{fix}</li>
            ))}
          </ul>
          <a
            href={PATCH_12_7_SOURCE}
            className="mt-4 inline-flex min-h-11 items-center underline underline-offset-4"
          >
            전체 수정 보기 ↗
          </a>
        </details>
      </section>
      <section id="patch-rank" className={section}>
        <h2 className={heading}>랭크·이벤트 — 적용 시점 확인</h2>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-[repeat(2,minmax(0,1fr))]">
          <article className="rounded-xl border border-[var(--color-border)] p-5">
            <p className="dashboard-kicker">12.7 적용</p>
            <h3 className="mt-2 font-bold">휴면 강등 유예 포인트 최대치</h3>
            <p className="mt-3 text-sm leading-7">
              데미갓 12 → 10
              <br />
              이터니티 12 → 8<br />
              메테오라이트·미스릴 12 유지
            </p>
          </article>
          <article className="rounded-xl border border-[var(--color-border)] p-5">
            <p className="dashboard-kicker">시즌 12</p>
            <h3 className="mt-2 font-bold">론울프 종료</h3>
            <p className={`mt-3 ${muted}`}>12.7 점검 이후 론울프 이벤트 모드가 종료됩니다.</p>
          </article>
        </div>
        <p className={muted}>
          박스·분해·개인 상점의 구성품과 확률 변경은 이번 패치가 아닌 11월 12일 13.0 업데이트
          예정입니다. 코발트 프로토콜 전용 보정은{" "}
          <a href={PATCH_12_7_SOURCE} className="underline underline-offset-4">
            공식 원문
          </a>
          에서 별도로 확인할 수 있습니다.
        </p>
      </section>
    </>
  );
}
