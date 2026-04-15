#!/usr/bin/env node
// INP 격리 실험 — Safari pointerup→click dispatch 고유 지연 vs JS 경합 몫 분리
//
// 가설 A: CPU 10x throttle 하에서 pointerup→click gap 232ms 는 Safari 의 pointer→click
//         합성 이벤트 체인 고유 지연이다 (React 커밋과 무관).
// 가설 B: 그 gap 의 상당 부분은 메인스레드 JS 경합이며, 경합이 없으면 gap 은 사라진다.
//
// 분리: 동일 CPU throttle 로 아래 3 시나리오 측정 후 비교.
//   inert  : 정적 버튼(핸들러 없음, 페이지에 다른 JS 없음)
//   busy   : 같은 버튼 + setInterval 로 80ms 블로킹 루프 주입 (인위적 경합)
//   render : 같은 버튼이나 onClick 으로 중간 비용 state 업데이트 (React-like 커밋 흉내)
//
// 기존 inp-breakdown.mjs 와 동일한 chromium(WebKit 엔진 아님) / iOS UA / CPU throttle 10x
// 조합을 씀. WebKit(진짜 Safari)과 동일하지는 않으나 "동일 엔진 위에서의 격리 비교"가
// 목적이므로 상대 비교는 유효하다.
import { chromium } from "playwright";

const RUNS = Number(process.env.RUNS ?? 3);
const CPU_THROTTLE = Number(process.env.CPU_THROTTLE ?? 10);
const INTER_TAP_MS = Number(process.env.INTER_TAP_MS ?? 50);
const TAPS_PER_RUN = Number(process.env.TAPS_PER_RUN ?? 6);

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
  for (const s of samples) if (by[s.name]) by[s.name].push(s.dur);
  return {
    pointerdown: summarise(by.pointerdown),
    pointerup: summarise(by.pointerup),
    click: summarise(by.click),
  };
}

const PAGE_HTML = (scenario) => `<!doctype html>
<html><head><meta name="viewport" content="width=device-width, initial-scale=1">
<style>
html,body{margin:0;padding:0;font-family:system-ui}
#btn{display:block;margin:80px auto;width:260px;height:80px;font-size:22px;touch-action:manipulation}
</style></head>
<body>
<button id="btn" type="button">tap me</button>
<script>
  window.__inpSamples = [];
  try {
    const obs = new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        if (e.interactionId && e.interactionId > 0) {
          window.__inpSamples.push({ dur: e.duration, name: e.name, iid: e.interactionId, t: e.startTime });
        }
      }
    });
    obs.observe({ type: "event", buffered: true, durationThreshold: 0 });
  } catch {}

  const scenario = ${JSON.stringify(scenario)};
  const btn = document.getElementById('btn');

  if (scenario === 'busy') {
    // 80ms 블로킹 루프를 100ms 간격으로 반복 -> 메인스레드 점유율 ~80%
    setInterval(() => {
      const end = performance.now() + 80;
      while (performance.now() < end) {}
    }, 100);
  }
  if (scenario === 'render') {
    // onClick 에서 중간 비용(약 40ms 블로킹 + DOM mutation)을 흉내냄
    btn.addEventListener('click', () => {
      const end = performance.now() + 40;
      while (performance.now() < end) {}
      const frag = document.createDocumentFragment();
      for (let i = 0; i < 200; i++) {
        const d = document.createElement('div');
        d.textContent = 'row ' + i + ' ' + Math.random();
        frag.appendChild(d);
      }
      // 누적 제거로 리스트 폭주는 막되 레이아웃/페인트 비용은 발생
      btn.parentNode.querySelectorAll('div.row').forEach(n => n.remove());
      const wrap = document.createElement('div');
      wrap.className = 'row';
      wrap.appendChild(frag);
      btn.parentNode.appendChild(wrap);
    });
  }
  // inert 시나리오는 어떤 핸들러도 붙이지 않음
</script>
</body></html>`;

async function setupPage(scenario) {
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
  await page.setContent(PAGE_HTML(scenario), { waitUntil: "load" });
  return { browser, page };
}

async function tapButton(page) {
  const handle = await page.$("#btn");
  const box = await handle.boundingBox();
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
}

async function runOnce(scenario) {
  const { browser, page } = await setupPage(scenario);
  // 페이지가 throttle 하에서 안정화되도록 대기
  await page.waitForTimeout(600);
  for (let i = 0; i < TAPS_PER_RUN; i++) {
    await tapButton(page);
    await page.waitForTimeout(INTER_TAP_MS + 120);
  }
  await page.waitForTimeout(400);
  const samples = await page.evaluate(() => window.__inpSamples ?? []);
  await browser.close();
  return samples;
}

async function runScenario(scenario) {
  console.log(`\n--- scenario=${scenario} throttle=${CPU_THROTTLE}x runs=${RUNS} taps/run=${TAPS_PER_RUN}`);
  const all = [];
  const byName = { pointerdown: [], pointerup: [], click: [] };
  for (let r = 1; r <= RUNS; r++) {
    try {
      const samples = await runOnce(scenario);
      for (const s of samples) {
        all.push(s.dur);
        if (byName[s.name]) byName[s.name].push(s.dur);
      }
      const bn = groupByName(samples);
      console.log(
        `run ${r}: n=${samples.length} pointerup p95=${bn.pointerup.p95?.toFixed?.(1)}ms click p95=${bn.click.p95?.toFixed?.(1)}ms`
      );
    } catch (err) {
      console.error(`run ${r} failed:`, err.message);
    }
  }
  const agAll = summarise(all);
  const agP = summarise(byName.pointerup);
  const agC = summarise(byName.click);
  const gapMed = agC.median != null && agP.median != null ? agC.median - agP.median : null;
  const gapP95 = agC.p95 != null && agP.p95 != null ? agC.p95 - agP.p95 : null;
  console.log(
    `AGG [${scenario}]: n=${agAll.n} overall median=${agAll.median?.toFixed?.(1)} p95=${agAll.p95?.toFixed?.(1)} max=${agAll.max?.toFixed?.(1)}`
  );
  console.log(
    `  pointerup median=${agP.median?.toFixed?.(1)}ms p95=${agP.p95?.toFixed?.(1)}ms`
  );
  console.log(
    `  click     median=${agC.median?.toFixed?.(1)}ms p95=${agC.p95?.toFixed?.(1)}ms`
  );
  console.log(
    `  gap (click - pointerup): median=${gapMed?.toFixed?.(1)}ms p95=${gapP95?.toFixed?.(1)}ms`
  );
  return { scenario, pointerup: agP, click: agC, gapMed, gapP95 };
}

(async () => {
  console.log(`=== INP isolation bench (Safari dispatch vs JS contention) ===`);
  const results = [];
  for (const sc of ["inert", "busy", "render"]) {
    results.push(await runScenario(sc));
  }
  console.log(`\n=== summary ===`);
  for (const r of results) {
    console.log(
      `${r.scenario.padEnd(7)} pointerup p95=${r.pointerup.p95?.toFixed?.(1).padStart(6)}ms  click p95=${r.click.p95?.toFixed?.(1).padStart(6)}ms  gap p95=${r.gapP95?.toFixed?.(1).padStart(6)}ms`
    );
  }
})();
