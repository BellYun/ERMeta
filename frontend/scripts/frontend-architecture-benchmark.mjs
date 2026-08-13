#!/usr/bin/env node

import { chromium } from "playwright";

const BASE_URL = process.env.BENCH_URL ?? "http://127.0.0.1:3124";
const CPU_THROTTLE = Number(process.env.CPU_THROTTLE ?? 6);
const RUNS = Number(process.env.RUNS ?? 5);
const MODE = process.argv[2] ?? "both";
const LABEL = process.argv[3] ?? "run";
const HOME_PATH = process.env.HOME_BENCH_PATH ?? "/performance-lab/home-filter";

function median(values) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function round(value, digits = 1) {
  if (value == null || !Number.isFinite(value)) return null;
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function summarize(results, keys) {
  return Object.fromEntries(
    keys.map((key) => [
      key,
      round(median(results.map((result) => result[key]).filter(Number.isFinite))),
    ])
  );
}

async function openPage(pathname, initScript) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    locale: "ko-KR",
    extraHTTPHeaders: { "Accept-Language": "ko-KR,ko;q=0.9" },
  });
  const page = await context.newPage();
  const client = await context.newCDPSession(page);
  await client.send("Emulation.setCPUThrottlingRate", { rate: CPU_THROTTLE });
  await client.send("Network.setCacheDisabled", { cacheDisabled: true });
  await page.addInitScript(initScript);
  await page.goto(`${BASE_URL}${pathname}`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  return { browser, page, client };
}

async function runMatrix() {
  const { browser, page, client } = await openPage("/synergy-matrix", () => {
    window.__architectureBench = {
      longTasks: [],
      canvasAt: null,
      loopDelays: [],
    };

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          window.__architectureBench.longTasks.push({
            startTime: entry.startTime,
            duration: entry.duration,
          });
        }
      });
      observer.observe({ type: "longtask", buffered: true });
    } catch {}

    let previous = performance.now();
    const sampleLoop = () => {
      const now = performance.now();
      window.__architectureBench.loopDelays.push({
        at: now,
        delay: Math.max(0, now - previous - 50),
      });
      previous = now;
      if (window.__architectureBench.canvasAt == null) {
        window.setTimeout(sampleLoop, 50);
      }
    };
    window.setTimeout(sampleLoop, 50);

    const markCanvas = () => {
      if (window.__architectureBench.canvasAt != null) return;
      if (!document.querySelector('canvas[role="img"]')) return;
      requestAnimationFrame(() => {
        window.__architectureBench.canvasAt = performance.now();
      });
    };
    new MutationObserver(markCanvas).observe(document, { childList: true, subtree: true });
    document.addEventListener("DOMContentLoaded", markCanvas, { once: true });
  });

  await page.waitForSelector('canvas[role="img"]', { timeout: 30_000 });
  await page.waitForFunction(() => window.__architectureBench?.canvasAt != null);
  await page.waitForTimeout(150);

  await client.send("HeapProfiler.collectGarbage");
  const heap = await client.send("Runtime.getHeapUsage");
  const raw = await page.evaluate(() => {
    const readyAt = window.__architectureBench.canvasAt;
    const longTasks = window.__architectureBench.longTasks.filter(
      (entry) => entry.startTime <= readyAt
    );
    const loopDelays = window.__architectureBench.loopDelays.filter((entry) => entry.at <= readyAt);
    const resource = performance
      .getEntriesByType("resource")
      .find((entry) => entry.name.includes("/_character_matrix.json"));
    return {
      readyMs: readyAt,
      longTaskCount: longTasks.length,
      longTaskTotalMs: longTasks.reduce((sum, entry) => sum + entry.duration, 0),
      longTaskMaxMs: Math.max(0, ...longTasks.map((entry) => entry.duration)),
      totalBlockingMs: longTasks.reduce((sum, entry) => sum + Math.max(0, entry.duration - 50), 0),
      eventLoopDelayMaxMs: Math.max(0, ...loopDelays.map((entry) => entry.delay)),
      resourceDurationMs: resource?.duration ?? null,
      resourceTransferBytes: resource?.transferSize ?? null,
      resourceEncodedBytes: resource?.encodedBodySize ?? null,
    };
  });

  await browser.close();
  return {
    ...raw,
    mainHeapMb: heap.usedSize / 1024 / 1024,
  };
}

async function runHome() {
  const { browser, page } = await openPage(HOME_PATH, () => {
    window.__architectureBench = { events: [] };
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.interactionId > 0) {
            window.__architectureBench.events.push({
              name: entry.name,
              startTime: entry.startTime,
              duration: entry.duration,
              interactionId: entry.interactionId,
            });
          }
        }
      });
      observer.observe({ type: "event", buffered: true, durationThreshold: 0 });
    } catch {}
  });

  await page.waitForSelector('button[role="radio"][aria-checked="true"]', { timeout: 30_000 });
  await page.waitForTimeout(800);

  const targetIndex = await page.evaluate(() => {
    const visible = [...document.querySelectorAll('button[role="radio"]')].filter(
      (element) =>
        element.getBoundingClientRect().width > 0 && element.getBoundingClientRect().height > 0
    );
    const index = visible.findLastIndex(
      (element) => element.getAttribute("aria-checked") !== "true"
    );
    const target = visible[index];
    if (!target) throw new Error("home_filter_target_not_found");

    const headings = [...document.querySelectorAll("h2")];
    const resultRoot = headings.at(-1)?.closest("section") ?? document.querySelector("main");
    window.__architectureBench.home = {
      clickAt: null,
      selectedAt: null,
      resultFirstAt: null,
      resultLastAt: null,
    };

    target.addEventListener(
      "pointerdown",
      () => {
        window.__architectureBench.home.clickAt = performance.now();
      },
      { capture: true, once: true }
    );

    new MutationObserver(() => {
      const now = performance.now();
      if (
        window.__architectureBench.home.selectedAt == null &&
        target.getAttribute("aria-checked") === "true"
      ) {
        window.__architectureBench.home.selectedAt = now;
      }
    }).observe(target, { attributes: true, attributeFilter: ["aria-checked", "data-active"] });

    if (resultRoot) {
      new MutationObserver(() => {
        const now = performance.now();
        window.__architectureBench.home.resultFirstAt ??= now;
        window.__architectureBench.home.resultLastAt = now;
      }).observe(resultRoot, {
        attributes: true,
        characterData: true,
        childList: true,
        subtree: true,
      });
    }

    return index;
  });

  const target = page.locator('button[role="radio"]:visible').nth(targetIndex);
  await target.click();
  await page.waitForFunction((index) => {
    const visible = [...document.querySelectorAll('button[role="radio"]')].filter(
      (element) =>
        element.getBoundingClientRect().width > 0 && element.getBoundingClientRect().height > 0
    );
    return visible[index]?.getAttribute("aria-checked") === "true";
  }, targetIndex);
  await page.waitForTimeout(1_000);

  const result = await page.evaluate(() => {
    const home = window.__architectureBench.home;
    const events = window.__architectureBench.events.filter(
      (entry) => home.clickAt != null && entry.startTime >= home.clickAt - 5
    );
    return {
      selectionFeedbackMs:
        home.clickAt != null && home.selectedAt != null ? home.selectedAt - home.clickAt : null,
      resultFirstCommitMs:
        home.clickAt != null && home.resultFirstAt != null
          ? home.resultFirstAt - home.clickAt
          : null,
      resultSettledMs:
        home.clickAt != null && home.resultLastAt != null ? home.resultLastAt - home.clickAt : null,
      interactionMs: Math.max(0, ...events.map((entry) => entry.duration)),
    };
  });

  await browser.close();
  return result;
}

async function runPipelineFlow(page, kind) {
  return page.evaluate(async (flowKind) => {
    const DATA_URL = new URL("/data/synergy-matrix/_character_matrix.json", window.location.origin)
      .href;
    const longTasks = [];
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        longTasks.push({ startTime: entry.startTime, duration: entry.duration });
      }
    });
    observer.observe({ type: "longtask", buffered: false });

    let loopDelayMaxMs = 0;
    let previousTick = performance.now();
    const interval = window.setInterval(() => {
      const now = performance.now();
      loopDelayMaxMs = Math.max(loopDelayMaxMs, now - previousTick - 10);
      previousTick = now;
    }, 10);

    const startedAt = performance.now();
    let parseMs = 0;
    let indexMs = 0;
    let postMessageSyncMs = 0;

    if (flowKind === "main") {
      const sinkSource = `
        self.onmessage = (event) => {
          const payload = event.data;
          let visible = 0;
          for (const cell of payload.cells) {
            if (cell.games >= 200) visible += 1;
          }
          self.postMessage(visible);
        };
      `;
      const sink = new Worker(
        URL.createObjectURL(new Blob([sinkSource], { type: "text/javascript" }))
      );
      const ready = new Promise((resolve, reject) => {
        sink.onmessage = resolve;
        sink.onerror = (event) => reject(new Error(event.message || "pipeline_sink_failed"));
      });
      const response = await fetch(DATA_URL, { cache: "no-store" });
      const json = await response.text();
      const parseStartedAt = performance.now();
      let payload = JSON.parse(json);
      parseMs = performance.now() - parseStartedAt;

      const indexStartedAt = performance.now();
      let _cellMap = new Map(
        payload.cells.map((cell) => [`${cell.rowCode}:${cell.colCode}`, cell])
      );
      indexMs = performance.now() - indexStartedAt;

      const postStartedAt = performance.now();
      sink.postMessage(payload);
      postMessageSyncMs = performance.now() - postStartedAt;
      await ready;
      sink.terminate();
      payload = null;
      _cellMap = null;
    } else {
      const workerSource = `
        self.onmessage = async (event) => {
          const response = await fetch(event.data, { cache: "no-store" });
          const json = await response.text();
          const payload = JSON.parse(json);
          const size = payload.characters.length;
          const length = size * size;
          const characterIndex = new Map(
            payload.characters.map((character, index) => [character.code, index])
          );
          const games = new Uint32Array(length);
          const rpLift = new Float32Array(length);
          let visible = 0;
          for (const cell of payload.cells) {
            const row = characterIndex.get(cell.rowCode);
            const col = characterIndex.get(cell.colCode);
            if (row == null || col == null) continue;
            const index = row * size + col;
            games[index] = cell.games;
            rpLift[index] = cell.rpLift;
            if (cell.games >= 200) visible += 1;
          }
          self.postMessage(
            { games, rpLift, visible },
            [games.buffer, rpLift.buffer]
          );
        };
      `;
      const worker = new Worker(
        URL.createObjectURL(new Blob([workerSource], { type: "text/javascript" }))
      );
      const ready = new Promise((resolve, reject) => {
        worker.onmessage = resolve;
        worker.onerror = (event) => reject(new Error(event.message || "pipeline_worker_failed"));
      });
      const postStartedAt = performance.now();
      worker.postMessage(DATA_URL);
      postMessageSyncMs = performance.now() - postStartedAt;
      await ready;
      worker.terminate();
    }

    await new Promise((resolve) => window.setTimeout(resolve, 50));
    window.clearInterval(interval);
    observer.disconnect();
    const endedAt = performance.now();
    const scopedLongTasks = longTasks.filter(
      (entry) => entry.startTime >= startedAt && entry.startTime <= endedAt
    );

    return {
      totalReadyMs: endedAt - startedAt - 50,
      parseMs,
      indexMs,
      postMessageSyncMs,
      mainLongTaskTotalMs: scopedLongTasks.reduce((sum, entry) => sum + entry.duration, 0),
      mainLongTaskMaxMs: Math.max(0, ...scopedLongTasks.map((entry) => entry.duration)),
      mainLoopDelayMaxMs: loopDelayMaxMs,
    };
  }, kind);
}

async function runPipeline(run) {
  const { browser, page } = await openPage("/robots.txt", () => {});
  const order = run % 2 === 0 ? ["worker", "main"] : ["main", "worker"];
  const result = {};
  for (const kind of order) {
    result[kind] = await runPipelineFlow(page, kind);
    await page.waitForTimeout(200);
  }
  await browser.close();
  return result;
}

async function runSuite(name, runner, keys) {
  const results = [];
  for (let run = 1; run <= RUNS; run += 1) {
    const result = await runner();
    results.push(result);
    // eslint-disable-next-line no-console
    console.log(
      `${name} ${run}/${RUNS}`,
      Object.fromEntries(Object.entries(result).map(([key, value]) => [key, round(value)]))
    );
  }
  // eslint-disable-next-line no-console
  console.log(`${name} median [${LABEL}]`, summarize(results, keys));
}

async function runPipelineSuite() {
  const main = [];
  const worker = [];
  for (let run = 1; run <= RUNS; run += 1) {
    const result = await runPipeline(run);
    main.push(result.main);
    worker.push(result.worker);
    // eslint-disable-next-line no-console
    console.log(`pipeline ${run}/${RUNS}`, {
      main: Object.fromEntries(
        Object.entries(result.main).map(([key, value]) => [key, round(value)])
      ),
      worker: Object.fromEntries(
        Object.entries(result.worker).map(([key, value]) => [key, round(value)])
      ),
    });
  }
  const keys = [
    "totalReadyMs",
    "parseMs",
    "indexMs",
    "postMessageSyncMs",
    "mainLongTaskTotalMs",
    "mainLongTaskMaxMs",
    "mainLoopDelayMaxMs",
  ];
  // eslint-disable-next-line no-console
  console.log(`pipeline median [${LABEL}]`, {
    main: summarize(main, keys),
    worker: summarize(worker, keys),
  });
}

if (MODE === "matrix" || MODE === "both") {
  await runSuite("matrix", runMatrix, [
    "readyMs",
    "longTaskCount",
    "longTaskTotalMs",
    "longTaskMaxMs",
    "totalBlockingMs",
    "eventLoopDelayMaxMs",
    "mainHeapMb",
    "resourceDurationMs",
    "resourceTransferBytes",
  ]);
}

if (MODE === "home" || MODE === "both") {
  await runSuite("home", runHome, [
    "selectionFeedbackMs",
    "resultFirstCommitMs",
    "resultSettledMs",
    "interactionMs",
  ]);
}

if (MODE === "pipeline") {
  await runPipelineSuite();
}
