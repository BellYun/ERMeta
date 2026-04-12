#!/usr/bin/env node
// INP 벤치마크 — CPU 6x 쓰로틀 + 모바일 터치 에뮬레이션
// 사용: node scripts/inp-benchmark.mjs [label]
import { chromium } from "playwright";

const LABEL = process.argv[2] ?? "run";
const URL = process.env.BENCH_URL ?? "http://localhost:3456/synergy-detail";
const CPU_THROTTLE = Number(process.env.CPU_THROTTLE ?? 6);
const RUNS = Number(process.env.RUNS ?? 3);

function summarise(samples) {
  if (samples.length === 0) return { median: null, p95: null, max: null, n: 0 };
  const sorted = [...samples].sort((a, b) => a - b);
  const pick = (p) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
  return {
    n: sorted.length,
    median: pick(0.5),
    p95: pick(0.95),
    max: sorted[sorted.length - 1],
  };
}

async function runOnce(run) {
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
            window.__inpSamples.push({ dur: e.duration, name: e.name, iid: e.interactionId });
          }
        }
      });
      obs.observe({ type: "event", buffered: true, durationThreshold: 0 });
    } catch {}
  });

  await page.goto(URL, { waitUntil: "domcontentloaded" });

  // 방해 오버레이 숨김 (sticky header, fixed 플로팅 위젯)
  await page.addStyleTag({
    content: `
      header.sticky { display: none !important; }
      [class*="fixed"][class*="bottom-"] { display: none !important; }
    `,
  });

  await page.waitForSelector('button[title*="("]', { timeout: 20000 });
  await page.waitForTimeout(800);

  // 두 개의 다른 캐릭터 셀 선택: 같은 charCode가 아니어야 disabled 회피
  const handles = await page.$$('button[title*="("]');
  if (handles.length < 10) throw new Error(`cells < 10 (${handles.length})`);

  // 첫 번째 버튼과 같은 캐릭터가 아닌 두 번째 버튼 찾기
  async function titleOf(h) {
    return await h.getAttribute("title");
  }
  const firstTitle = (await titleOf(handles[0])) ?? "";
  const firstChar = firstTitle.split(" (")[0];
  let secondIdx = -1;
  for (let i = 1; i < handles.length; i++) {
    const t = (await titleOf(handles[i])) ?? "";
    if (!t.startsWith(firstChar)) {
      secondIdx = i;
      break;
    }
  }
  if (secondIdx < 0) throw new Error("no distinct second cell");

  async function tapElement(h) {
    const box = await h.boundingBox();
    if (!box) throw new Error("no bbox");
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    await page.evaluate(
      ([x, y]) => window.scrollTo(0, Math.max(0, y - 400)),
      [x, y]
    );
    const box2 = await h.boundingBox();
    await page.touchscreen.tap(
      box2.x + box2.width / 2,
      box2.y + box2.height / 2
    );
  }

  // 실제 워스트케이스: fetch 응답 도착 직후 setResults가 30카드 재렌더를 시작할 때
  // 사용자가 2번 탭. page.waitForResponse로 정확한 타이밍 포착.
  const INTER_TAP_MS = Number(process.env.INTER_TAP_MS ?? 50); // 응답 후 지연
  const t1 = Date.now();
  const respWait = page.waitForResponse(
    (resp) => resp.url().includes("/api/stats/trios-weapon") && resp.status() === 200,
    { timeout: 8000 }
  );
  await tapElement(handles[0]);
  try {
    await respWait;
  } catch {
    // 응답 타임아웃이어도 계속 진행
  }
  await page.waitForTimeout(INTER_TAP_MS);
  await tapElement(handles[secondIdx]);
  await page.waitForTimeout(1800);
  const wall = Date.now() - t1;

  const samples = await page.evaluate(() => window.__inpSamples ?? []);
  await browser.close();

  const durations = samples.map((s) => s.dur);
  return { run, durations, wall, samples };
}

(async () => {
  console.log(
    `\n=== INP benchmark [${LABEL}] throttle=${CPU_THROTTLE}x runs=${RUNS} ===`
  );
  const all = [];
  for (let i = 1; i <= RUNS; i++) {
    try {
      const r = await runOnce(i);
      all.push(...r.durations);
      const s = summarise(r.durations);
      console.log(
        `run ${i}: samples=${s.n} median=${s.median?.toFixed?.(1)}ms p95=${s.p95?.toFixed?.(1)}ms max=${s.max?.toFixed?.(1)}ms wall=${r.wall}ms`
      );
      if (r.samples.length) {
        const ev = r.samples
          .filter((s) => ["pointerdown", "pointerup", "click"].includes(s.name))
          .map((s) => `${s.name}=${s.dur.toFixed(0)}ms`)
          .join(" ");
        console.log(`  events: ${ev}`);
      }
    } catch (err) {
      console.error(`run ${i} failed:`, err.message);
    }
  }
  const agg = summarise(all);
  console.log(
    `\nAGGREGATE [${LABEL}]: n=${agg.n} median=${agg.median?.toFixed?.(1)}ms p95=${agg.p95?.toFixed?.(1)}ms max=${agg.max?.toFixed?.(1)}ms`
  );
})();
