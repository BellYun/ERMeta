#!/usr/bin/env node

import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const args = new Map();
for (let index = 2; index < process.argv.length; index += 2) {
  args.set(process.argv[index], process.argv[index + 1]);
}

const label = args.get("--label") ?? "benchmark";
const baseUrl = args.get("--base-url") ?? "http://127.0.0.1:3411";
const runs = Number(args.get("--runs") ?? 10);
const cpuThrottle = Number(args.get("--cpu") ?? 6);
const latencyMs = Number(args.get("--latency") ?? 150);
const downloadKbps = Number(args.get("--download-kbps") ?? 1600);
const uploadKbps = Number(args.get("--upload-kbps") ?? 750);
const settleMs = Number(args.get("--settle-ms") ?? 5000);
const outputPath = args.get("--output");
const selectedModes = (args.get("--modes") ?? "cold,warm").split(",");
const routes = ["/ko/about", "/ko/character/1"];

if (!Number.isFinite(runs) || runs < 1) throw new Error("--runs must be >= 1");
if (selectedModes.some((mode) => mode !== "cold" && mode !== "warm")) {
  throw new Error("--modes must contain cold and/or warm");
}

const percentile = (values, ratio) => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.ceil(ratio * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, rank))];
};

const round = (value, digits = 1) => {
  if (value == null || !Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

const summarise = (samples, key) => {
  const values = samples.map((sample) => sample[key]).filter(Number.isFinite);
  if (values.length === 0) return null;
  return {
    n: values.length,
    median: round(percentile(values, 0.5)),
    p95: round(percentile(values, 0.95)),
    min: round(Math.min(...values)),
    max: round(Math.max(...values)),
  };
};

const metricNames = [
  "documentTransferBytes",
  "documentEncodedBodyBytes",
  "documentDecodedBodyBytes",
  "responseDownloadMs",
  "ttfbMs",
  "fcpMs",
  "lcpMs",
  "domContentLoadedMs",
  "loadMs",
  "scriptDurationMs",
  "taskDurationMs",
  "jsHeapUsedBytes",
  "l10nTransferBytes",
  "l10nEncodedBodyBytes",
  "l10nRequestCount",
  "l10nNetworkRequestCount",
];

function networkConditions() {
  return {
    offline: false,
    latency: latencyMs,
    downloadThroughput: (downloadKbps * 1024) / 8,
    uploadThroughput: (uploadKbps * 1024) / 8,
    connectionType: "cellular4g",
  };
}

async function configurePage(page, cacheDisabled) {
  const client = await page.context().newCDPSession(page);
  await client.send("Network.enable");
  await client.send("Performance.enable");
  await client.send("Network.setCacheDisabled", { cacheDisabled });
  await client.send("Network.emulateNetworkConditions", networkConditions());
  await client.send("Network.setBlockedURLs", { urls: ["https://*"] });
  await client.send("Emulation.setCPUThrottlingRate", { rate: cpuThrottle });

  await page.addInitScript(() => {
    window.__l10nBenchLcp = 0;
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          window.__l10nBenchLcp = Math.max(window.__l10nBenchLcp, entry.startTime);
        }
      }).observe({ type: "largest-contentful-paint", buffered: true });
    } catch {}
  });

  return client;
}

async function collectNavigation(page, client, pathname, run, mode, targetUrl) {
  const requests = new Map();

  client.on("Network.responseReceived", (event) => {
    requests.set(event.requestId, {
      url: event.response.url,
      type: event.type,
      status: event.response.status,
      fromDiskCache: event.response.fromDiskCache,
      fromServiceWorker: event.response.fromServiceWorker,
      protocol: event.response.protocol,
      mimeType: event.response.mimeType,
      responseEncodedDataLength: event.response.encodedDataLength,
      transferBytes: null,
    });
  });

  client.on("Network.loadingFinished", (event) => {
    const request = requests.get(event.requestId);
    if (request) request.transferBytes = event.encodedDataLength;
  });

  const url =
    targetUrl ?? `${baseUrl}${pathname}?l10n_bench=${label}-${mode}-${run}-${Date.now()}`;
  await page.goto(url, { waitUntil: "load", timeout: 90_000 });
  await page.waitForTimeout(settleMs);

  const browserMetrics = await page.evaluate(() => {
    const navigation = performance.getEntriesByType("navigation")[0];
    const fcp = performance.getEntriesByName("first-contentful-paint")[0];
    return {
      navigation: navigation
        ? {
            transferSize: navigation.transferSize,
            encodedBodySize: navigation.encodedBodySize,
            decodedBodySize: navigation.decodedBodySize,
            requestStart: navigation.requestStart,
            responseStart: navigation.responseStart,
            responseEnd: navigation.responseEnd,
            domContentLoadedEventEnd: navigation.domContentLoadedEventEnd,
            loadEventEnd: navigation.loadEventEnd,
          }
        : null,
      fcp: fcp?.startTime ?? null,
      lcp: window.__l10nBenchLcp || null,
    };
  });

  const performanceMetrics = await client.send("Performance.getMetrics");
  const performanceMap = Object.fromEntries(
    performanceMetrics.metrics.map(({ name, value }) => [name, value])
  );

  const documentRequest = [...requests.values()].find(
    (request) => request.type === "Document" && new URL(request.url).pathname === pathname
  );
  const l10nRequests = [...requests.values()].filter((request) =>
    new URL(request.url).pathname.startsWith("/l10n/")
  );
  const nav = browserMetrics.navigation;

  return {
    run,
    mode,
    route: pathname,
    documentTransferBytes: documentRequest?.transferBytes ?? nav?.transferSize ?? null,
    documentEncodedBodyBytes: nav?.encodedBodySize ?? null,
    documentDecodedBodyBytes: nav?.decodedBodySize ?? null,
    responseDownloadMs:
      nav && nav.responseEnd >= nav.requestStart ? nav.responseEnd - nav.requestStart : null,
    ttfbMs: nav && nav.responseStart >= nav.requestStart ? nav.responseStart - nav.requestStart : null,
    fcpMs: browserMetrics.fcp,
    lcpMs: browserMetrics.lcp,
    domContentLoadedMs: nav?.domContentLoadedEventEnd ?? null,
    loadMs: nav?.loadEventEnd ?? null,
    scriptDurationMs: (performanceMap.ScriptDuration ?? 0) * 1000,
    taskDurationMs: (performanceMap.TaskDuration ?? 0) * 1000,
    jsHeapUsedBytes: performanceMap.JSHeapUsedSize ?? null,
    l10nTransferBytes: l10nRequests.reduce(
      (sum, request) => sum + (request.transferBytes ?? 0),
      0
    ),
    l10nEncodedBodyBytes: l10nRequests.reduce(
      (sum, request) => sum + (request.responseEncodedDataLength ?? 0),
      0
    ),
    l10nRequestCount: l10nRequests.length,
    l10nNetworkRequestCount: l10nRequests.filter(
      (request) => !request.fromDiskCache && !request.fromServiceWorker
    ).length,
    l10nRequests: l10nRequests.map((request) => ({
      pathname: new URL(request.url).pathname,
      transferBytes: request.transferBytes,
      fromDiskCache: request.fromDiskCache,
      status: request.status,
    })),
    document: documentRequest
      ? {
          protocol: documentRequest.protocol,
          status: documentRequest.status,
          transferBytes: documentRequest.transferBytes,
        }
      : null,
  };
}

async function measureCold(browser, pathname, run) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 " +
      "(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  });
  const page = await context.newPage();
  const client = await configurePage(page, true);
  const result = await collectNavigation(page, client, pathname, run, "cold");
  await context.close();
  return result;
}

async function measureWarm(browser, pathname, run) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 " +
      "(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  });

  const warmUrl = `${baseUrl}${pathname}?l10n_bench=${label}-warm-${run}-${Date.now()}`;
  const primePage = await context.newPage();
  const primeClient = await configurePage(primePage, false);
  await collectNavigation(primePage, primeClient, pathname, run, "prime", warmUrl);
  await primePage.close();

  const page = await context.newPage();
  const client = await configurePage(page, false);
  const result = await collectNavigation(page, client, pathname, run, "warm", warmUrl);
  await context.close();
  return result;
}

const browser = await chromium.launch({ headless: true });
const samples = [];

try {
  for (const pathname of routes) {
    if (selectedModes.includes("cold")) {
      for (let run = 1; run <= runs; run += 1) {
        process.stderr.write(`[${label}] ${pathname} cold ${run}/${runs}\n`);
        samples.push(await measureCold(browser, pathname, run));
      }
    }
    if (selectedModes.includes("warm")) {
      for (let run = 1; run <= runs; run += 1) {
        process.stderr.write(`[${label}] ${pathname} warm ${run}/${runs}\n`);
        samples.push(await measureWarm(browser, pathname, run));
      }
    }
  }
} finally {
  await browser.close();
}

const summary = {};
for (const pathname of routes) {
  summary[pathname] = {};
  for (const mode of ["cold", "warm"]) {
    const scoped = samples.filter((sample) => sample.route === pathname && sample.mode === mode);
    summary[pathname][mode] = Object.fromEntries(
      metricNames.map((metric) => [metric, summarise(scoped, metric)])
    );
  }
}

const result = {
  label,
  conditions: {
    runs,
    cpuThrottle,
    latencyMs,
    downloadKbps,
    uploadKbps,
    settleMs,
    modes: selectedModes,
    viewport: "390x844@3x",
    cache: "cold=disabled; warm=primed same context",
    externalHttps: "blocked",
  },
  summary,
  samples,
};
const serialized = `${JSON.stringify(result, null, 2)}\n`;

if (outputPath) {
  writeFileSync(outputPath, serialized);
  process.stderr.write(`[${label}] wrote ${outputPath}\n`);
} else {
  process.stdout.write(serialized);
}
