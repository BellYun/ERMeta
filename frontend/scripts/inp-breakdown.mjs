#!/usr/bin/env node
// INP 벤치 — /synergy-detail 두 워스트케이스 (BENCH_TARGET=ally | breakdown)
//
// ally       : WeaponAllySelector CharWeaponCell 탭(아군 선택)
//              워스트케이스 = 1번 탭 직후 fetch 응답으로 setResults 가 30 카드 재조정을 시작한
//              바로 그 frame 에 두 번째 셀을 탭. inp-benchmark.mjs 와 같은 시나리오이나 여기서는
//              click vs pointerup duration gap 패턴을 강조 수집.
// breakdown  : 아군 1명 선택 → 결과 로드 대기 → 첫 ComboWeaponCard 메인 행을 탭(특성 브레이크다운
//              토글). 첫 탭의 setShowTraits commit 중에 두 번째 카드 탭 → 두 번째 탭이 워스트.
//
// 사용:
//   node frontend/scripts/inp-breakdown.mjs [label]
//   BENCH_TARGET=breakdown node frontend/scripts/inp-breakdown.mjs after-fix
//   CPU_THROTTLE=10 RUNS=3 BENCH_URL=http://localhost:3456/synergy-detail node ...
//
// 출력: run 별 event duration + aggregate(median/p95/max). click duration 과 pointerup
//       duration 의 gap 을 별도 라인으로 출력해 iOS click delay 패턴을 가시화.
import { chromium } from "playwright";

const LABEL = process.argv[2] ?? "run";
const URL = process.env.BENCH_URL ?? "http://localhost:3456/synergy-detail";
const CPU_THROTTLE = Number(process.env.CPU_THROTTLE ?? 10);
const RUNS = Number(process.env.RUNS ?? 3);
const TARGET = process.env.BENCH_TARGET ?? "breakdown"; // ally | breakdown
const INTER_TAP_MS = Number(process.env.INTER_TAP_MS ?? 50);

function pct(sorted, p) {
  if (sorted.length === 0) return null;
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
}

function summarise(samples) {
  if (samples.length === 0) return { n: 0, median: null, p95: null, max: null };
  const sorted = [...samples].sort((a, b) => a - b);
  return {
    n: sorted.length,
    median: pct(sorted, 0.5),
    p95: pct(sorted, 0.95),
    max: sorted[sorted.length - 1],
  };
}

function groupByName(samples) {
  const by = { pointerdown: [], pointerup: [], click: [] };
  for (const s of samples) {
    if (by[s.name]) by[s.name].push(s.dur);
  }
  return {
    pointerdown: summarise(by.pointerdown),
    pointerup: summarise(by.pointerup),
    click: summarise(by.click),
  };
}

async function setupPage() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 " +
      "(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  });
  const page = await ctx.newPage();
  const client = await ctx.newCDPSession(page);
  await client.send("Emulation.setCPUThrottlingRate", { rate: CPU_THROTTLE });

  await page.addInitScript(() => {
    window.__inpSamples = [];
    try {
      const obs = new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          if (e.interactionId && e.interactionId > 0) {
            window.__inpSamples.push({
              dur: e.duration,
              name: e.name,
              iid: e.interactionId,
              t: e.startTime,
            });
          }
        }
      });
      obs.observe({ type: "event", buffered: true, durationThreshold: 0 });
    } catch {}
  });

  await page.goto(URL, { waitUntil: "domcontentloaded" });
  // 방해 오버레이 숨김 (sticky header, fixed 플로팅 위젯, 하단 MobileTabBar)
  await page.addStyleTag({
    content: `
      header.sticky { display: none !important; }
      [class*="fixed"][class*="bottom-"] { display: none !important; }
    `,
  });
  return { browser, page };
}

async function tap(page, handle) {
  const box = await handle.boundingBox();
  if (!box) throw new Error("no bbox");
  await page.evaluate(
    ([, y]) => window.scrollTo(0, Math.max(0, y - 300)),
    [box.x, box.y]
  );
  const b2 = await handle.boundingBox();
  await page.touchscreen.tap(b2.x + b2.width / 2, b2.y + b2.height / 2);
}

async function runAlly(page) {
  await page.waitForSelector('button[title*="("]', { timeout: 20000 });
  await page.waitForTimeout(800);
  const cells = await page.$$('button[title*="("]');
  if (cells.length < 10) throw new Error(`cells < 10 (${cells.length})`);
  const firstTitle = (await cells[0].getAttribute("title")) ?? "";
  const firstChar = firstTitle.split(" (")[0];
  let secondIdx = -1;
  for (let i = 1; i < cells.length; i++) {
    const t = (await cells[i].getAttribute("title")) ?? "";
    if (!t.startsWith(firstChar)) {
      secondIdx = i;
      break;
    }
  }
  if (secondIdx < 0) throw new Error("no distinct second cell");

  const respWait = page.waitForResponse(
    (resp) => resp.url().includes("/api/stats/trios-weapon") && resp.status() === 200,
    { timeout: 8000 }
  );
  await tap(page, cells[0]);
  try {
    await respWait;
  } catch {}
  await page.waitForTimeout(INTER_TAP_MS);
  await tap(page, cells[secondIdx]);
  await page.waitForTimeout(1800);
}

async function runBreakdown(page) {
  // 1) 아군 1명 선택
  await page.waitForSelector('button[title*="("]', { timeout: 20000 });
  await page.waitForTimeout(600);
  const cells = await page.$$('button[title*="("]');
  if (cells.length < 1) throw new Error("no cells");
  const respWait = page.waitForResponse(
    (resp) => resp.url().includes("/api/stats/trios-weapon") && resp.status() === 200,
    { timeout: 10000 }
  );
  await tap(page, cells[0]);
  try {
    await respWait;
  } catch {}
  // 2) 조합 카드가 나타날 때까지 대기. 브레이크다운 토글 대상: [role="button"] 이 결과 영역의
  //    카드로 렌더됨. 선택기는 카드 내부 rank span + weapon image 조합으로 좁혀 잡는다.
  const cardLoc = 'div[role="button"][tabindex="0"]:has(img[alt]):has(span)';
  await page.waitForSelector(cardLoc, { timeout: 15000 });
  await page.waitForTimeout(500);
  const cards = await page.$$(cardLoc);
  if (cards.length < 2) throw new Error(`cards < 2 (${cards.length})`);
  // 3) 첫 카드 탭 (브레이크다운 expand 시작) → 잠깐 대기 → 두 번째 카드 탭 (워스트케이스)
  await tap(page, cards[0]);
  await page.waitForTimeout(INTER_TAP_MS);
  await tap(page, cards[1]);
  await page.waitForTimeout(1500);
}

async function runOnce(run) {
  const { browser, page } = await setupPage();
  const t1 = Date.now();
  if (TARGET === "ally") await runAlly(page);
  else await runBreakdown(page);
  const wall = Date.now() - t1;
  const samples = await page.evaluate(() => window.__inpSamples ?? []);
  await browser.close();
  return { run, samples, wall };
}

(async () => {
  console.log(
    `\n=== INP breakdown bench [${LABEL}] target=${TARGET} throttle=${CPU_THROTTLE}x runs=${RUNS} ===`
  );
  const all = [];
  const perName = { pointerdown: [], pointerup: [], click: [] };
  for (let i = 1; i <= RUNS; i++) {
    try {
      const { samples, wall } = await runOnce(i);
      const durs = samples.map((s) => s.dur);
      all.push(...durs);
      for (const s of samples) {
        if (perName[s.name]) perName[s.name].push(s.dur);
      }
      const agg = summarise(durs);
      const byName = groupByName(samples);
      console.log(
        `run ${i}: samples=${agg.n} median=${agg.median?.toFixed?.(1)}ms p95=${agg.p95?.toFixed?.(1)}ms max=${agg.max?.toFixed?.(1)}ms wall=${wall}ms`
      );
      const ev = samples
        .filter((s) => ["pointerdown", "pointerup", "click"].includes(s.name))
        .map((s) => `${s.name}=${s.dur.toFixed(0)}ms`)
        .join(" ");
      console.log(`  events: ${ev}`);
      console.log(
        `  pointerup p95=${byName.pointerup.p95?.toFixed?.(1)}ms click p95=${byName.click.p95?.toFixed?.(1)}ms`
      );
    } catch (err) {
      console.error(`run ${i} failed:`, err.message);
    }
  }
  const overall = summarise(all);
  const agPointerup = summarise(perName.pointerup);
  const agClick = summarise(perName.click);
  const gapMedian =
    agClick.median != null && agPointerup.median != null
      ? agClick.median - agPointerup.median
      : null;
  const gapP95 =
    agClick.p95 != null && agPointerup.p95 != null ? agClick.p95 - agPointerup.p95 : null;
  console.log(
    `\nAGGREGATE [${LABEL}]: n=${overall.n} median=${overall.median?.toFixed?.(1)}ms p95=${overall.p95?.toFixed?.(1)}ms max=${overall.max?.toFixed?.(1)}ms`
  );
  console.log(
    `  pointerup median=${agPointerup.median?.toFixed?.(1)}ms p95=${agPointerup.p95?.toFixed?.(1)}ms`
  );
  console.log(
    `  click     median=${agClick.median?.toFixed?.(1)}ms p95=${agClick.p95?.toFixed?.(1)}ms`
  );
  console.log(
    `  gap (click - pointerup): median=${gapMedian?.toFixed?.(1)}ms p95=${gapP95?.toFixed?.(1)}ms`
  );
  const reproP95 =
    agClick.p95 != null && agPointerup.p95 != null && gapP95 >= 50;
  const reproAbs = agClick.p95 != null && agClick.p95 >= 200;
  console.log(
    `  reproduction: gap≥50ms=${reproP95 ? "YES" : "no"}  click-p95≥200ms=${reproAbs ? "YES" : "no"}`
  );
})();
