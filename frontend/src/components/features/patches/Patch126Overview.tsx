/* Hallmark · Index-First · Open Studio (design.md) · P4 H4 E4 S5 R5 V4 */
import { Gem } from "lucide-react";
import Image from "next/image";
import itemImages from "@/../const/itemImageMap.json";
import {
  FEATURED_EQUIPMENT,
  OTHER_EQUIPMENT,
  COMMON_CHANGES,
  QUALITY_CHANGES,
  FIXES,
  PATCH_12_6_SOURCE,
  type EquipmentChange,
} from "@/data/12.6-overview";
import { ChangeTypeBadgeStatic } from "./ChangeTypeBadgeStatic";

const heading =
  "text-xl font-bold tracking-tight text-[var(--color-foreground)] [overflow-wrap:anywhere]";
const muted = "text-sm leading-6 text-[var(--color-muted-foreground)]";
const section = "min-w-0 scroll-mt-24 space-y-5 border-t border-[var(--color-border)] pt-6";
const labels = { buff: "상향", nerf: "하향", rework: "조정" };
function Equipment({ item, compact = false }: { item: EquipmentChange; compact?: boolean }) {
  const path = (itemImages as Record<string, string>)[item.code];
  return (
    <article
      className={`min-w-0 ${compact ? "py-4" : "rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5"}`}
    >
      <div className="flex min-w-0 items-center gap-3">
        {path ? (
          <Image
            src={path.split("/").map(encodeURIComponent).join("/")}
            alt=""
            width={56}
            height={56}
            className="h-14 w-14 shrink-0 rounded-md object-contain bg-[var(--color-surface-2)]"
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
          <h3 className="font-bold text-[var(--color-foreground)] [overflow-wrap:anywhere]">
            {item.name}
          </h3>
          <div className="mt-1">
            <ChangeTypeBadgeStatic type={item.direction} label={labels[item.direction]} />
          </div>
        </div>
      </div>
      <ul className="mt-4 space-y-2 text-sm leading-6 text-[var(--color-foreground)] [overflow-wrap:anywhere]">
        {item.changes.map((value) => (
          <li key={value}>
            {value.includes(" → ") ? (
              <>
                {value.split(" → ")[0]} <span aria-hidden="true">→</span>{" "}
                <strong>{value.split(" → ")[1]}</strong>
              </>
            ) : (
              <strong>{value}</strong>
            )}
          </li>
        ))}
      </ul>
      {item.note && <p className={`mt-3 ${muted}`}>{item.note}</p>}
    </article>
  );
}
export function Patch126Intro() {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <p className="text-[var(--color-muted-foreground)]">
          2026.10.15 · 정기 점검 11:00–15:00 KST · 루미아 섬 중심
        </p>
        <a
          href={PATCH_12_6_SOURCE}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center whitespace-nowrap font-semibold text-[var(--color-accent-foreground)] underline underline-offset-4"
        >
          공식 패치노트 ↗
        </a>
      </div>
      <p className="max-w-3xl text-lg leading-8 text-[var(--color-foreground)]">
        장비 선택부터 마지막 교전까지.
        <br />
        아이템·실험체 변경과 놓치기 쉬운 개선 사항을 한곳에서 확인하세요.
      </p>
      <p className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-3 text-sm leading-6 text-[var(--color-muted-foreground)]">
        12.6 랭크 통계는 표본 기준을 채우면 순위에 반영됩니다. 그전에는 12.5 통계를 기준으로
        표시합니다.
      </p>
      <nav aria-label="12.6 패치 목차" className="flex flex-wrap gap-2">
        {[
          ["equipment", "주요 아이템"],
          ["other-equipment", "나머지 장비"],
          ["common", "특성·무기 스킬"],
          ["characters", "실험체"],
          ["quality", "게임·편의"],
          ["rank", "랭크·이벤트"],
        ].map(([id, label]) => (
          <a
            key={id}
            href={`#patch-${id}`}
            className="inline-flex min-h-11 items-center whitespace-nowrap rounded-md border border-[var(--color-border)] px-4 text-sm font-semibold hover:bg-[var(--color-surface-2)] focus-visible:outline-2 focus-visible:outline-[var(--color-focus)]"
          >
            {label}
          </a>
        ))}
      </nav>
      <section id="patch-equipment" className={section}>
        <div>
          <p className="dashboard-kicker">EQUIPMENT</p>
          <h2 className={`mt-2 ${heading}`}>먼저 살펴볼 아이템</h2>
          <p className={`mt-2 ${muted}`}>
            중첩 조건, 새 옵션, 고유 효과까지 함께 읽어야 하는 변경입니다.
          </p>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-[repeat(2,minmax(0,1fr))] xl:grid-cols-[repeat(3,minmax(0,1fr))]">
          {FEATURED_EQUIPMENT.map((item) => (
            <Equipment key={item.code} item={item} />
          ))}
        </div>
      </section>
      <section id="patch-other-equipment" className={section}>
        <h2 className={heading}>나머지 장비도 빠짐없이</h2>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-6 md:grid-cols-[repeat(2,minmax(0,1fr))]">
          {(["buff", "nerf"] as const).map((direction) => (
            <div key={direction}>
              <h3 className="border-b border-[var(--color-border)] pb-3 font-semibold">
                {labels[direction]}
              </h3>
              <div className="divide-y divide-[var(--color-border)]">
                {OTHER_EQUIPMENT.filter((item) => item.direction === direction).map((item) => (
                  <Equipment key={item.code} item={item} compact />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
      <section id="patch-common" className={section}>
        <h2 className={heading}>특성·전술·무기 스킬</h2>
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
export function Patch126Extras() {
  return (
    <>
      <section id="patch-quality" className={section}>
        <div>
          <p className="dashboard-kicker">PLAY & QUALITY OF LIFE</p>
          <h2 className={`mt-2 ${heading}`}>알아두면 달라지는 플레이</h2>
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
            href={PATCH_12_6_SOURCE}
            className="mt-4 inline-flex min-h-11 items-center underline underline-offset-4"
          >
            외형·로비 등 전체 수정 보기 ↗
          </a>
        </details>
      </section>
      <section id="patch-rank" className={section}>
        <h2 className={heading}>랭크·이벤트 — 적용 시점 확인</h2>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-[repeat(2,minmax(0,1fr))]">
          <article className="rounded-xl border border-[var(--color-border)] p-5">
            <p className="dashboard-kicker">12.6 적용</p>
            <h3 className="mt-2 font-bold">유예 포인트 지급 방식</h3>
            <p className={`mt-3 ${muted}`}>
              메테오라이트 승격 시에만 12점을 지급합니다. 이후 티어 승급 시 보유 포인트를 유지하며,
              랭크 게임 정상 종료마다 1점 획득은 유지됩니다.
            </p>
            <p className={`mt-3 ${muted}`}>
              최상위 매칭 큐: 아시아 8,700점 이상 · 북미 메테오라이트 4 이상 · 유럽 다이아몬드 2
              이상.
            </p>
          </article>
          <article className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-2)] p-5">
            <p className="dashboard-kicker">12.7 예정 · 이번 패치 미적용</p>
            <h3 className="mt-2 font-bold">유예 포인트 최대치</h3>
            <p className="mt-3 text-sm leading-7">
              데미갓 12 → 10
              <br />
              이터니티 12 → 8<br />
              메테오라이트·미스릴 12 유지
            </p>
          </article>
        </div>
        <article className="border-l-2 border-[var(--color-accent)] pl-5">
          <h3 className="font-bold">론울프가 돌아옵니다</h3>
          <p className={`mt-2 ${muted}`}>
            18명이 최후의 1인을 가리는 솔로 이벤트 모드. 아시아1 20:00–00:00 · 아시아2 21:00–01:00 ·
            아시아3 20:00–23:00 (KST).
          </p>
        </article>
        <details className="border-t border-[var(--color-border)] pt-4">
          <summary className="cursor-pointer py-2 font-semibold">스킨·교환소 소식</summary>
          <p className={`mt-3 ${muted}`}>
            미스틱 퓨어 바니 수아 출시. 10월 20일에는 이단심판관 에키온과 대표 이미지·모델링을
            교체한 뒷골목 에키온이 출시됩니다. 세일링 토큰 교환소에는 10월 15일 점검 후부터 29일
            점검 전까지 트로피컬 디멘션 아비게일, Mk.VIII Destroyer M.A.G 스킨과 아비게일 퀘스트
            북이 추가됩니다.
          </p>
        </details>
        <p className={muted}>
          코발트 프로토콜 전용 보정과 전체 외형 수정은{" "}
          <a href={PATCH_12_6_SOURCE} className="underline underline-offset-4">
            공식 원문
          </a>
          에서 확인할 수 있습니다. 이 페이지는 변경 사항 정리이며 패치 후 성능 판정이 아닙니다.
        </p>
      </section>
    </>
  );
}
