#!/usr/bin/env node
/* eslint-disable no-console */
// 모바일 연속 선택 벤치마크.
//
// 기존 inp-benchmark.mjs와 달리 두 번째 탭의 pointerdown/pointerup/click을
// interactionId로 묶고, 시나리오 1회당 하나의 대표값(그룹 내 최대 duration)만
// 산출한다. 이 값은 실제 사용자 INP가 아니라 특정 시나리오의 lab Event Timing이다.
// 기본 after-api-response 모드는 첫 API 성공 응답을 Node 쪽에서 관찰한 시점부터
// 고정 간격 뒤 두 번째 탭을 예약한다. 첫 결과 계산이 무거워져도 입력 시점이 함께
// 뒤로 밀리지 않는다. 결과 완료는 안내 문구나 마운트된 카드 DOM을 다시 직렬화하지
// 않고 전체 결과 배열에서 만든 data-result-version 변경으로 판정한다.
//
// 사용:
//   RUNS=30 CPU_THROTTLE=6 \
//   BENCH_URL=http://127.0.0.1:3456/synergy-detail \
//   node scripts/inp-interaction-benchmark.mjs before
import fs from "node:fs";
import { chromium } from "playwright";

const LABEL = process.argv[2] ?? "run";
const URL = process.env.BENCH_URL ?? "http://127.0.0.1:3456/synergy-detail";
const CPU_THROTTLE = Number(process.env.CPU_THROTTLE ?? 6);
const RUNS = Number(process.env.RUNS ?? 30);
const WARMUP_RUNS = Number(process.env.WARMUP_RUNS ?? 0);
const INTER_TAP_MS = Number(process.env.INTER_TAP_MS ?? 50);
const FIRST_RESULT_TIMEOUT_MS = Number(process.env.FIRST_RESULT_TIMEOUT_MS ?? 20_000);
const SECOND_TAP_MODE = process.env.SECOND_TAP_MODE ?? "after-api-response";
const EXPECTED_RESULT_SELECTION_COUNT = Number(process.env.EXPECTED_RESULT_SELECTION_COUNT ?? 2);
const SECOND_TAP_OFFSET_X = Number(process.env.SECOND_TAP_OFFSET_X ?? 0);
const SECOND_TAP_OFFSET_Y = Number(process.env.SECOND_TAP_OFFSET_Y ?? 0);
const ALLOW_MISSING_EVENT_TIMING = process.env.ALLOW_MISSING_EVENT_TIMING === "1";
const OUTPUT_PATH = process.env.OUTPUT_PATH;
const TRACE_PATH = process.env.TRACE_PATH;
const MEASURE_RESULT_COMPLETION = process.env.MEASURE_RESULT_COMPLETION !== "0";
const MEASURE_URL_COMPLETION = process.env.MEASURE_URL_COMPLETION !== "0";
const EVENT_NAMES = new Set(["pointerdown", "pointerup", "click"]);

if (!["after-response", "after-api-response", "fixed-delay"].includes(SECOND_TAP_MODE)) {
  throw new Error(`unsupported SECOND_TAP_MODE: ${SECOND_TAP_MODE}`);
}

function percentile(values, p) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.max(0, Math.ceil(p * sorted.length) - 1);
  return sorted[index];
}

function summarise(values) {
  const finiteValues = values.filter(Number.isFinite);
  if (finiteValues.length === 0) {
    return { n: 0, median: null, p95: null, max: null };
  }
  return {
    n: finiteValues.length,
    median: percentile(finiteValues, 0.5),
    p95: percentile(finiteValues, 0.95),
    max: Math.max(...finiteValues),
  };
}

function groupSecondInteraction(samples, pointerDownTime) {
  if (pointerDownTime == null) return null;
  const groups = new Map();
  for (const sample of samples) {
    if (!EVENT_NAMES.has(sample.name)) {
      continue;
    }
    const group = groups.get(sample.interactionId) ?? [];
    group.push(sample);
    groups.set(sample.interactionId, group);
  }

  const candidates = [...groups.entries()]
    .map(([interactionId, entries]) => ({
      interactionId,
      entries,
      firstStart: Math.min(...entries.map((entry) => entry.startTime)),
    }))
    .map((candidate) => ({
      ...candidate,
      distanceFromPointerDown: Math.abs(candidate.firstStart - pointerDownTime),
    }))
    .filter(({ distanceFromPointerDown }) => distanceFromPointerDown <= 32)
    .sort((a, b) => a.distanceFromPointerDown - b.distanceFromPointerDown);

  if (candidates.length === 0) return null;
  const selected = candidates[0];
  const representative = [...selected.entries].sort((a, b) => {
    if (b.duration !== a.duration) return b.duration - a.duration;
    const aProcessing = a.processingEnd - a.processingStart;
    const bProcessing = b.processingEnd - b.processingStart;
    if (bProcessing !== aProcessing) return bProcessing - aProcessing;
    return Number(b.name === "click") - Number(a.name === "click");
  })[0];
  const inputDelay = representative.processingStart - representative.startTime;
  const processingDuration = representative.processingEnd - representative.processingStart;
  const presentationDelay = Math.max(0, representative.duration - inputDelay - processingDuration);

  return {
    interactionId: selected.interactionId,
    duration: representative.duration,
    startTime: representative.startTime,
    endTime: representative.startTime + representative.duration,
    inputDelay,
    processingDuration,
    presentationDelay,
    entries: selected.entries.sort((a, b) => a.startTime - b.startTime),
  };
}

async function tap(page, locator) {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  if (!box) throw new Error("tap target has no bounding box");
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
}

async function tapAt(page, box) {
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
}

async function installFixedTapProxy(page, locator, box) {
  const title = await locator.getAttribute("title");
  if (!title) throw new Error("tap proxy target has no title");

  await page.evaluate(
    ({ targetTitle, targetBox }) => {
      document.querySelector("[data-benchmark-tap-proxy]")?.remove();

      const findTarget = () =>
        [...document.querySelectorAll("button")].find(
          (button) =>
            !button.hasAttribute("data-benchmark-tap-proxy") &&
            button.getAttribute("title") === targetTitle
        );
      const forwardPointerEvent = (sourceEvent) => {
        const target = findTarget();
        if (!target) return;
        target.dispatchEvent(
          new PointerEvent(sourceEvent.type, {
            bubbles: true,
            cancelable: true,
            composed: true,
            pointerId: sourceEvent.pointerId,
            pointerType: sourceEvent.pointerType,
            isPrimary: sourceEvent.isPrimary,
            button: sourceEvent.button,
            buttons: sourceEvent.buttons,
            clientX: sourceEvent.clientX,
            clientY: sourceEvent.clientY,
            screenX: sourceEvent.screenX,
            screenY: sourceEvent.screenY,
          })
        );
      };

      const proxy = document.createElement("button");
      proxy.type = "button";
      proxy.tabIndex = -1;
      proxy.setAttribute("aria-hidden", "true");
      proxy.dataset.benchmarkTapProxy = "true";
      proxy.dataset.benchmarkTargetTitle = targetTitle;
      proxy.style.cssText = [
        "position:fixed",
        `left:${targetBox.x}px`,
        `top:${targetBox.y}px`,
        `width:${targetBox.width}px`,
        `height:${targetBox.height}px`,
        "z-index:2147483647",
        "opacity:0.001",
        "pointer-events:auto",
        "touch-action:manipulation",
      ].join(";");
      proxy.addEventListener("pointerdown", forwardPointerEvent);
      proxy.addEventListener("pointermove", forwardPointerEvent);
      proxy.addEventListener("pointercancel", forwardPointerEvent);
      proxy.addEventListener("pointerup", (event) => {
        forwardPointerEvent(event);
        // The current implementation activates on pointerup; the baseline
        // implementation activates on click. Both are invoked synchronously
        // inside the trusted proxy interaction so Event Timing still covers
        // the React update caused by the real cell.
        findTarget()?.click();
      });
      document.body.appendChild(proxy);
    },
    { targetTitle: title, targetBox: box }
  );
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function startPerformanceTrace(client) {
  await client.send("Tracing.start", {
    categories: "devtools.timeline,blink.user_timing,loading,rail",
    transferMode: "ReturnAsStream",
  });
}

async function stopPerformanceTrace(client, outputPath) {
  const completed = new Promise((resolve) => {
    client.once("Tracing.tracingComplete", resolve);
  });
  await client.send("Tracing.end");
  const { stream } = await completed;
  let trace = "";
  let eof = false;
  while (!eof) {
    const chunk = await client.send("IO.read", { handle: stream });
    trace += chunk.data;
    eof = chunk.eof;
  }
  await client.send("IO.close", { handle: stream });
  fs.writeFileSync(outputPath, trace);
}

async function armSelectionFeedback(page, locator, key) {
  await locator.evaluate((element, measurementKey) => {
    window.__selectionFeedbackMeasurements ??= {};
    window.__selectionFeedbackObservers ??= {};
    window.__selectionFeedbackObservers[measurementKey]?.disconnect();
    const targetTitle = element.getAttribute("title");
    window.__selectionFeedbackMeasurements[measurementKey] = {
      pointerDown: null,
      selected: null,
      initialClassName: null,
    };
    const handlePointerDown = (event) => {
      const eventButton = event.target instanceof Element ? event.target.closest("button") : null;
      const eventTitle =
        eventButton?.getAttribute("title") ?? eventButton?.dataset.benchmarkTargetTitle ?? null;
      if (!eventButton || eventTitle !== targetTitle) return;
      const targetButton = eventButton.hasAttribute("data-benchmark-tap-proxy")
        ? [...document.querySelectorAll("button")].find(
            (button) =>
              !button.hasAttribute("data-benchmark-tap-proxy") &&
              button.getAttribute("title") === targetTitle
          )
        : eventButton;
      if (!targetButton) return;
      const measurement = window.__selectionFeedbackMeasurements[measurementKey];
      measurement.pointerDown = event.timeStamp;
      measurement.initialClassName = targetButton.getAttribute("class");
      performance.mark(`ermeta-${measurementKey}-pointer-listener`);
      const observer = new MutationObserver(() => {
        if (
          measurement.selected == null &&
          targetButton.getAttribute("class") !== measurement.initialClassName
        ) {
          measurement.selected = performance.now();
          performance.mark(`ermeta-${measurementKey}-selection-commit`);
        }
      });
      observer.observe(targetButton, { attributes: true, attributeFilter: ["class"] });
      window.__selectionFeedbackObservers[measurementKey] = observer;
      document.removeEventListener("pointerdown", handlePointerDown, true);
    };
    document.addEventListener("pointerdown", handlePointerDown, { capture: true });
  }, key);
}

async function readSelectionFeedback(page, key) {
  return page.evaluate((measurementKey) => {
    window.__selectionFeedbackObservers?.[measurementKey]?.disconnect();
    const measurement = window.__selectionFeedbackMeasurements?.[measurementKey] ?? null;
    if (!measurement || measurement.pointerDown == null || measurement.selected == null) {
      return null;
    }
    return {
      pointerDown: measurement.pointerDown,
      selected: measurement.selected,
      duration: measurement.selected - measurement.pointerDown,
    };
  }, key);
}

async function armUrlUpdate(page, locator, key) {
  await locator.evaluate((element, measurementKey) => {
    const targetTitle = element.getAttribute("title");
    window.__urlUpdateMeasurements ??= {};
    window.__urlUpdateMeasurements[measurementKey] = {
      pointerDown: null,
      initialHref: window.location.href,
      updated: null,
      finalHref: null,
      observerDuration: null,
    };

    if (!window.__ermetaUrlMeasurementInstalled) {
      const replaceState = window.history.replaceState;
      window.history.replaceState = function measuredReplaceState(...args) {
        const result = Reflect.apply(replaceState, this, args);
        const observerStartedAt = performance.now();
        const updatedAt = performance.now();
        const currentHref = window.location.href;
        for (const [keyName, measurement] of Object.entries(window.__urlUpdateMeasurements ?? {})) {
          if (
            measurement.pointerDown != null &&
            measurement.updated == null &&
            currentHref !== measurement.initialHref
          ) {
            measurement.updated = updatedAt;
            measurement.finalHref = currentHref;
            measurement.observerDuration = performance.now() - observerStartedAt;
            performance.mark(`ermeta-${keyName}-url-update`);
          }
        }
        return result;
      };
      window.__ermetaUrlMeasurementInstalled = true;
    }

    const handlePointerDown = (event) => {
      const targetButton = event.target instanceof Element ? event.target.closest("button") : null;
      const eventTitle =
        targetButton?.getAttribute("title") ?? targetButton?.dataset.benchmarkTargetTitle ?? null;
      if (!targetButton || eventTitle !== targetTitle) return;
      const measurement = window.__urlUpdateMeasurements[measurementKey];
      measurement.pointerDown = event.timeStamp;
      measurement.initialHref = window.location.href;
      document.removeEventListener("pointerdown", handlePointerDown, true);
    };
    document.addEventListener("pointerdown", handlePointerDown, { capture: true });
  }, key);
}

async function readUrlUpdate(page, key) {
  return page.evaluate((measurementKey) => {
    const measurement = window.__urlUpdateMeasurements?.[measurementKey] ?? null;
    if (!measurement || measurement.pointerDown == null || measurement.updated == null) {
      return null;
    }
    return {
      pointerDown: measurement.pointerDown,
      updated: measurement.updated,
      duration: measurement.updated - measurement.pointerDown,
      finalHref: measurement.finalHref,
      observerDuration: measurement.observerDuration,
    };
  }, key);
}

async function armResultUpdate(page, key, expectedSelectionCount) {
  await page.evaluate(
    ({ measurementKey, selectionCount }) => {
      const readResultVersion = (block) => block?.getAttribute("data-result-version") ?? null;
      const isExpectedResultVersion = (version) => {
        if (version == null) return false;
        return version.split("|").length === selectionCount;
      };

      window.__resultUpdateMeasurements ??= {};
      window.__resultUpdateObservers ??= {};
      window.__resultUpdateObservers[measurementKey]?.disconnect();

      const initialBlock = document.querySelector("[data-sr-block]");
      const root = initialBlock?.closest("section") ?? document.body;
      const measurement = {
        initialVersion: readResultVersion(initialBlock),
        updated: null,
        observerCalls: 0,
        observerDuration: 0,
        observerMaxDuration: 0,
      };
      window.__resultUpdateMeasurements[measurementKey] = measurement;

      const observer = new MutationObserver(() => {
        if (measurement.updated != null) return;
        const startedAt = performance.now();
        measurement.observerCalls += 1;
        const currentBlock = root.querySelector("[data-sr-block]");
        if (!currentBlock) {
          const duration = performance.now() - startedAt;
          measurement.observerDuration += duration;
          measurement.observerMaxDuration = Math.max(measurement.observerMaxDuration, duration);
          return;
        }
        const currentVersion = readResultVersion(currentBlock);
        const duration = performance.now() - startedAt;
        measurement.observerDuration += duration;
        measurement.observerMaxDuration = Math.max(measurement.observerMaxDuration, duration);
        if (
          currentVersion != null &&
          currentVersion !== measurement.initialVersion &&
          isExpectedResultVersion(currentVersion)
        ) {
          measurement.updated = performance.now();
          performance.mark(`ermeta-${measurementKey}-result-commit`);
          observer.disconnect();
        }
      });
      observer.observe(root, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["data-result-version"],
      });
      window.__resultUpdateObservers[measurementKey] = observer;
    },
    { measurementKey: key, selectionCount: expectedSelectionCount }
  );
}

async function readResultUpdate(page, key, pointerDownTime) {
  return page.evaluate(
    ({ measurementKey, pointerDown }) => {
      window.__resultUpdateObservers?.[measurementKey]?.disconnect();
      const measurement = window.__resultUpdateMeasurements?.[measurementKey] ?? null;
      if (!measurement || pointerDown == null) return null;
      const duration = measurement.updated == null ? null : measurement.updated - pointerDown;
      return {
        duration: duration != null && duration >= 0 ? duration : null,
        observerCalls: measurement.observerCalls,
        observerDuration: measurement.observerDuration,
        observerMaxDuration: measurement.observerMaxDuration,
      };
    },
    { measurementKey: key, pointerDown: pointerDownTime }
  );
}

async function runOnce(browser, run) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) " +
      "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 " +
      "Mobile/15E148 Safari/604.1",
  });
  const page = await context.newPage();
  const client = await context.newCDPSession(page);
  await client.send("Emulation.setCPUThrottlingRate", {
    rate: CPU_THROTTLE,
  });

  await page.addInitScript(() => {
    window.__eventTimingSamples = [];
    window.__longTaskSamples = [];
    window.__pointerTargetSamples = [];
    document.addEventListener(
      "pointerdown",
      (event) => {
        const target = event.target instanceof Element ? event.target : null;
        const button = target?.closest("button") ?? null;
        const expectedButton = [...document.querySelectorAll("button")].find(
          (candidate) => candidate.getAttribute("title") === window.__expectedSecondTitle
        );
        const expectedRect = expectedButton?.getBoundingClientRect();
        window.__pointerTargetSamples.push({
          timeStamp: event.timeStamp,
          clientX: event.clientX,
          clientY: event.clientY,
          scrollY: window.scrollY,
          tagName: target?.tagName ?? null,
          title: button?.getAttribute("title") ?? null,
          text: button?.textContent?.trim().slice(0, 80) ?? null,
          expectedRect: expectedRect
            ? {
                x: expectedRect.x,
                y: expectedRect.y,
                width: expectedRect.width,
                height: expectedRect.height,
              }
            : null,
        });
      },
      { capture: true }
    );
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.interactionId > 0) {
          window.__eventTimingSamples.push({
            name: entry.name,
            interactionId: entry.interactionId,
            duration: entry.duration,
            startTime: entry.startTime,
            processingStart: entry.processingStart,
            processingEnd: entry.processingEnd,
          });
        }
      }
    });
    observer.observe({ type: "event", buffered: true, durationThreshold: 0 });

    try {
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          window.__longTaskSamples.push({
            startTime: entry.startTime,
            duration: entry.duration,
          });
        }
      });
      longTaskObserver.observe({ type: "longtask", buffered: true });
    } catch {}
  });

  try {
    await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.addStyleTag({
      content: `
        header.sticky { display: none !important; }
        [class*="fixed"][class*="bottom-"] { display: none !important; }
      `,
    });

    const cells = page.locator('button[title*="("]');
    await cells.first().waitFor({ state: "visible", timeout: 20_000 });
    await page.waitForTimeout(800);

    const cellCount = await cells.count();
    if (cellCount < 10) throw new Error(`cells < 10 (${cellCount})`);

    const firstTitle = (await cells.nth(0).getAttribute("title")) ?? "";
    const firstCharacter = firstTitle.split(" (")[0];
    let secondIndex = -1;
    for (let index = 1; index < cellCount; index += 1) {
      const title = (await cells.nth(index).getAttribute("title")) ?? "";
      if (!title.startsWith(firstCharacter)) {
        secondIndex = index;
        break;
      }
    }
    if (secondIndex < 0) throw new Error("no distinct second cell");

    const apiResponseAnchored = SECOND_TAP_MODE === "after-api-response";
    const firstCell = cells.nth(0);
    const secondCell = cells.nth(secondIndex);
    await firstCell.scrollIntoViewIfNeeded();
    await secondCell.scrollIntoViewIfNeeded();
    const firstTapBox = apiResponseAnchored ? await firstCell.boundingBox() : null;
    const secondTapBox = apiResponseAnchored ? await secondCell.boundingBox() : null;
    if (apiResponseAnchored && (!firstTapBox || !secondTapBox)) {
      throw new Error("API-anchored tap target has no bounding box");
    }
    if (apiResponseAnchored) {
      const secondTitle = await secondCell.getAttribute("title");
      await page.evaluate((title) => {
        window.__expectedSecondTitle = title;
      }, secondTitle);
      await installFixedTapProxy(page, secondCell, secondTapBox);
    }

    await page.evaluate(() => {
      window.__perfRenderCounters = { cells: 0, cards: 0 };
    });
    await armSelectionFeedback(page, firstCell, "first");
    if (MEASURE_URL_COMPLETION) await armUrlUpdate(page, firstCell, "first");
    if (apiResponseAnchored) {
      await armSelectionFeedback(page, secondCell, "second");
      if (MEASURE_URL_COMPLETION) await armUrlUpdate(page, secondCell, "second");
      if (MEASURE_RESULT_COMPLETION) {
        await armResultUpdate(page, "second", EXPECTED_RESULT_SELECTION_COUNT);
      }
    }
    let responseObserved = false;
    let responseObservedAt = null;
    const responsePromise = page
      .waitForResponse(
        (response) =>
          response.url().includes("/api/stats/trios-weapon") && response.status() === 200,
        { timeout: 10_000 }
      )
      .then(() => {
        responseObserved = true;
        responseObservedAt = performance.now();
      })
      .catch(() => {});

    const shouldTrace = Boolean(TRACE_PATH) && run === 1;
    if (shouldTrace) await startPerformanceTrace(client);
    if (apiResponseAnchored) await tapAt(page, firstTapBox);
    else await tap(page, firstCell);
    if (SECOND_TAP_MODE === "after-response" || SECOND_TAP_MODE === "after-api-response") {
      await responsePromise;
      if (!responseObserved) {
        throw new Error("first result response was not observed");
      }
    }
    if (SECOND_TAP_MODE === "after-response") {
      await page.locator('[data-sr-block] [role="button"]').first().waitFor({
        state: "visible",
        timeout: FIRST_RESULT_TIMEOUT_MS,
      });
    }
    if (apiResponseAnchored) {
      await wait(INTER_TAP_MS);
    } else await page.waitForTimeout(INTER_TAP_MS);

    const beforeSecondTap = apiResponseAnchored
      ? { renderCounters: null }
      : await page.evaluate(() => {
          const counters = window.__perfRenderCounters;
          window.__eventTimingSamples = [];
          window.__longTaskSamples = [];
          window.__perfRenderCounters = { cells: 0, cards: 0 };
          return {
            renderCounters: counters ?? null,
          };
        });
    if (!apiResponseAnchored) {
      await armSelectionFeedback(page, secondCell, "second");
      if (MEASURE_URL_COMPLETION) await armUrlUpdate(page, secondCell, "second");
      if (SECOND_TAP_MODE !== "fixed-delay" && MEASURE_RESULT_COMPLETION) {
        await armResultUpdate(page, "second", EXPECTED_RESULT_SELECTION_COUNT);
      }
    }
    if (!apiResponseAnchored && shouldTrace) await startPerformanceTrace(client);
    const secondTapRequestedAt = performance.now();
    if (apiResponseAnchored) {
      await page.touchscreen.tap(
        secondTapBox.x + secondTapBox.width / 2 + SECOND_TAP_OFFSET_X,
        secondTapBox.y + secondTapBox.height / 2 + SECOND_TAP_OFFSET_Y
      );
    } else await tap(page, secondCell);
    await page.waitForTimeout(1_800);
    if (shouldTrace) await stopPerformanceTrace(client, TRACE_PATH);
    const firstSelectionMeasurement = await readSelectionFeedback(page, "first");
    const secondSelectionMeasurement = await readSelectionFeedback(page, "second");
    const firstUrlMeasurement = MEASURE_URL_COMPLETION ? await readUrlUpdate(page, "first") : null;
    const secondUrlMeasurement = MEASURE_URL_COMPLETION
      ? await readUrlUpdate(page, "second")
      : null;

    const { samples, longTasks, renderCountersAfterSecondTap, compositionInsights } =
      await page.evaluate(() => ({
        samples: window.__eventTimingSamples ?? [],
        longTasks: window.__longTaskSamples ?? [],
        renderCountersAfterSecondTap: window.__perfRenderCounters ?? null,
        compositionInsights: {
          completed: document.querySelectorAll("[data-composition-pattern-badge]").length,
          pending: document.querySelectorAll("[data-composition-insight-pending]").length,
        },
      }));
    const secondPointerDown = secondSelectionMeasurement?.pointerDown ?? null;
    const secondResultMeasurement =
      SECOND_TAP_MODE !== "fixed-delay" && MEASURE_RESULT_COMPLETION
        ? await readResultUpdate(page, "second", secondPointerDown)
        : null;
    const interaction = groupSecondInteraction(samples, secondPointerDown);
    const measuredLongTasks =
      secondPointerDown == null
        ? []
        : longTasks.filter(
            (task) =>
              task.startTime + task.duration >= secondPointerDown &&
              task.startTime <= secondPointerDown + 1_800
          );
    if (!interaction && !ALLOW_MISSING_EVENT_TIMING) {
      const pointerTargets = await page.evaluate(() => window.__pointerTargetSamples ?? []);
      throw new Error(
        `second tap interaction was not observed: ${JSON.stringify({
          secondPointerDown,
          pointerTargets,
          samples,
        })}`
      );
    }

    return {
      run,
      responseObserved,
      secondTapRequestDelayFromResponse:
        responseObservedAt == null ? null : secondTapRequestedAt - responseObservedAt,
      firstSelectionFeedback: firstSelectionMeasurement?.duration ?? null,
      secondSelectionFeedback: secondSelectionMeasurement?.duration ?? null,
      firstUrlUpdate: firstUrlMeasurement?.duration ?? null,
      secondUrlUpdate: secondUrlMeasurement?.duration ?? null,
      secondUrlHref: secondUrlMeasurement?.finalHref ?? null,
      firstUrlObserverDuration: firstUrlMeasurement?.observerDuration ?? null,
      secondUrlObserverDuration: secondUrlMeasurement?.observerDuration ?? null,
      secondSelectedAt: secondSelectionMeasurement?.selected ?? null,
      secondResultUpdate: secondResultMeasurement?.duration ?? null,
      resultObserver: secondResultMeasurement
        ? {
            calls: secondResultMeasurement.observerCalls,
            totalDuration: secondResultMeasurement.observerDuration,
            maxDuration: secondResultMeasurement.observerMaxDuration,
          }
        : null,
      secondPointerDown,
      longTasks: measuredLongTasks,
      compositionInsightsAfterWait: compositionInsights,
      renderCountersAfterFirstTap: beforeSecondTap.renderCounters,
      renderCountersAfterSecondTap,
      ...(interaction ?? {
        interactionId: null,
        duration: null,
        startTime: null,
        endTime: null,
        inputDelay: null,
        processingDuration: null,
        presentationDelay: null,
        entries: [],
      }),
    };
  } finally {
    await context.close();
  }
}

const browser = await chromium.launch({ headless: true });
const results = [];
const failures = [];

console.log(
  `\n=== interaction benchmark [${LABEL}] throttle=${CPU_THROTTLE}x ` +
    `warmups=${WARMUP_RUNS} runs=${RUNS} ===`
);

try {
  for (let warmup = 1; warmup <= WARMUP_RUNS; warmup += 1) {
    try {
      await runOnce(browser, -warmup);
      console.log(`warm-up ${warmup}/${WARMUP_RUNS}: complete`);
    } catch (error) {
      console.warn(`warm-up ${warmup}/${WARMUP_RUNS}: ${error.message}`);
    }
  }

  for (let run = 1; run <= RUNS; run += 1) {
    try {
      const result = await runOnce(browser, run);
      results.push(result);
      console.log(
        `run ${run}: interaction=${result.interactionId ?? "below-threshold"} ` +
          `duration=${result.duration?.toFixed(1) ?? "below-threshold"}ms ` +
          `selection=${result.secondSelectionFeedback?.toFixed(1) ?? "n/a"}ms ` +
          `response=${result.responseObserved ? "observed" : "timeout"}`
      );
    } catch (error) {
      failures.push({ run, error: error.message });
      console.error(`run ${run} failed: ${error.message}`);
    }
  }
} finally {
  await browser.close();
}

const durations = results.map((result) => result.duration);
const summary = summarise(durations);
const timingBreakdown = {
  inputDelay: summarise(results.map((result) => result.inputDelay)),
  processingDuration: summarise(results.map((result) => result.processingDuration)),
  presentationDelay: summarise(results.map((result) => result.presentationDelay)),
};
const selectionFeedback = {
  first: summarise(
    results.map((result) => result.firstSelectionFeedback).filter((value) => value != null)
  ),
  second: summarise(
    results.map((result) => result.secondSelectionFeedback).filter((value) => value != null)
  ),
};
const resultUpdate = summarise(
  results.map((result) => result.secondResultUpdate).filter((value) => value != null)
);
const urlUpdate = {
  first: summarise(results.map((result) => result.firstUrlUpdate).filter((value) => value != null)),
  second: summarise(
    results.map((result) => result.secondUrlUpdate).filter((value) => value != null)
  ),
};
const urlObserver = {
  first: summarise(
    results.map((result) => result.firstUrlObserverDuration).filter((value) => value != null)
  ),
  second: summarise(
    results.map((result) => result.secondUrlObserverDuration).filter((value) => value != null)
  ),
};
const selectionAfterInteractionEnd = summarise(
  results
    .map((result) => {
      if (result.secondSelectedAt == null || result.endTime == null) return null;
      return result.secondSelectedAt - result.endTime;
    })
    .filter((value) => value != null)
);
const resultObserver = {
  calls: summarise(
    results.map((result) => result.resultObserver?.calls).filter((value) => value != null)
  ),
  totalDuration: summarise(
    results.map((result) => result.resultObserver?.totalDuration).filter((value) => value != null)
  ),
  maxCallbackDuration: summarise(
    results.map((result) => result.resultObserver?.maxDuration).filter((value) => value != null)
  ),
};
const longTasks = {
  count: results.reduce((count, result) => count + result.longTasks.length, 0),
  runsWithLongTasks: results.filter((result) => result.longTasks.length > 0).length,
  duration: summarise(results.flatMap((result) => result.longTasks.map((task) => task.duration))),
};
const interactionLongTaskEntries = results.flatMap((result) => {
  if (result.secondPointerDown == null || result.duration == null) return [];
  const interactionEnd = result.secondPointerDown + result.duration;
  return result.longTasks
    .filter(
      (task) =>
        task.startTime < interactionEnd && task.startTime + task.duration > result.secondPointerDown
    )
    .map((task) => ({ ...task, run: result.run }));
});
const interactionLongTasks = {
  count: interactionLongTaskEntries.length,
  runsWithLongTasks: new Set(interactionLongTaskEntries.map((task) => task.run)).size,
  duration: summarise(interactionLongTaskEntries.map((task) => task.duration)),
};
const output = {
  label: LABEL,
  url: URL,
  cpuThrottle: CPU_THROTTLE,
  interTapMs: INTER_TAP_MS,
  firstResultTimeoutMs: FIRST_RESULT_TIMEOUT_MS,
  secondTapMode: SECOND_TAP_MODE,
  expectedResultSelectionCount: EXPECTED_RESULT_SELECTION_COUNT,
  secondTapOffset: { x: SECOND_TAP_OFFSET_X, y: SECOND_TAP_OFFSET_Y },
  resultCompletion: MEASURE_RESULT_COMPLETION ? "full-result-version-marker" : "disabled",
  urlCompletion: MEASURE_URL_COMPLETION ? "history-replace-state" : "disabled",
  tracePath: TRACE_PATH ?? null,
  warmupRuns: WARMUP_RUNS,
  requestedRuns: RUNS,
  successfulRuns: results.length,
  responseTimeouts: results.filter((result) => !result.responseObserved).length,
  summary,
  timingBreakdown,
  selectionFeedback,
  urlUpdate,
  urlObserver,
  selectionAfterInteractionEnd,
  resultUpdate,
  resultObserver,
  longTasks,
  interactionLongTasks,
  results,
  failures,
};

console.log(
  `\nAGGREGATE [${LABEL}]: independent_interactions=${summary.n} ` +
    `median=${summary.median?.toFixed(1)}ms ` +
    `p95=${summary.p95?.toFixed(1)}ms max=${summary.max?.toFixed(1)}ms ` +
    `failures=${failures.length}`
);
console.log(
  `SELECTION FEEDBACK [${LABEL}]: ` +
    `first median=${selectionFeedback.first.median?.toFixed(1)}ms ` +
    `p95=${selectionFeedback.first.p95?.toFixed(1)}ms; ` +
    `second median=${selectionFeedback.second.median?.toFixed(1)}ms ` +
    `p95=${selectionFeedback.second.p95?.toFixed(1)}ms`
);
console.log(
  `URL UPDATE [${LABEL}]: ` +
    `first median=${urlUpdate.first.median?.toFixed(1) ?? "n/a"}ms ` +
    `p95=${urlUpdate.first.p95?.toFixed(1) ?? "n/a"}ms; ` +
    `second median=${urlUpdate.second.median?.toFixed(1) ?? "n/a"}ms ` +
    `p95=${urlUpdate.second.p95?.toFixed(1) ?? "n/a"}ms`
);
console.log(
  `URL OBSERVER OVERHEAD [${LABEL}] p95: ` +
    `first=${urlObserver.first.p95?.toFixed(3) ?? "n/a"}ms ` +
    `second=${urlObserver.second.p95?.toFixed(3) ?? "n/a"}ms`
);
console.log(
  `RESULT DOM COMMIT [${LABEL}]: n=${resultUpdate.n} ` +
    `median=${resultUpdate.median?.toFixed(1) ?? "n/a"}ms ` +
    `p95=${resultUpdate.p95?.toFixed(1) ?? "n/a"}ms`
);
console.log(
  `SELECTION VS INTERACTION END [${LABEL}]: ` +
    `median=${selectionAfterInteractionEnd.median?.toFixed(1) ?? "n/a"}ms ` +
    `p95=${selectionAfterInteractionEnd.p95?.toFixed(1) ?? "n/a"}ms ` +
    `(positive means selection committed after Event Timing end)`
);
console.log(
  `RESULT OBSERVER OVERHEAD [${LABEL}] p95: ` +
    `calls=${resultObserver.calls.p95?.toFixed(1) ?? "n/a"} ` +
    `total=${resultObserver.totalDuration.p95?.toFixed(3) ?? "n/a"}ms ` +
    `max-callback=${resultObserver.maxCallbackDuration.p95?.toFixed(3) ?? "n/a"}ms`
);
console.log(
  `TIMING BREAKDOWN [${LABEL}] p95: ` +
    `input=${timingBreakdown.inputDelay.p95?.toFixed(1)}ms ` +
    `processing=${timingBreakdown.processingDuration.p95?.toFixed(1)}ms ` +
    `presentation=${timingBreakdown.presentationDelay.p95?.toFixed(1)}ms`
);
console.log(
  `LONG TASKS [${LABEL}]: count=${longTasks.count} runs=${longTasks.runsWithLongTasks} ` +
    `p95=${longTasks.duration.p95?.toFixed(1) ?? "none"}ms`
);
console.log(
  `INTERACTION-OVERLAP LONG TASKS [${LABEL}]: count=${interactionLongTasks.count} ` +
    `runs=${interactionLongTasks.runsWithLongTasks} ` +
    `p95=${interactionLongTasks.duration.p95?.toFixed(1) ?? "none"}ms`
);

if (OUTPUT_PATH) {
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`wrote ${OUTPUT_PATH}`);
}

if (results.length !== RUNS) process.exitCode = 1;
