export type AdScriptState = "not_scheduled" | "scheduled" | "loading" | "loaded" | "error";
export type AdDeliveryState =
  | "no_slot"
  | "slot_only"
  | "requested"
  | "filled"
  | "viewable"
  | "blocked_or_failed";

export type AdSlotLifecycleState =
  | "rendered"
  | "requested"
  | "filled"
  | "unfilled"
  | "timeout"
  | "viewable";

export interface AdPerformanceSnapshot {
  scriptState: AdScriptState;
  scriptLoadMs: number | null;
  deliveryState: AdDeliveryState;
  renderedSlotCount: number;
  requestedSlotCount: number;
  filledSlotCount: number;
  viewableSlotCount: number;
  failedSlotCount: number;
  adResourceCount: number;
  adResourceDurationMs: number;
  adTransferKb: number | null;
  pageLongTaskCount: number;
  pageLongTaskTotalMs: number;
  pageLongTaskMaxMs: number;
  adFrameLongTaskCount: number;
  adFrameLongTaskTotalMs: number;
  adCorrelatedLongTaskCount: number;
  adCorrelatedLongTaskTotalMs: number;
}

interface RecordedResource {
  key: string;
  startTime: number;
  responseEnd: number;
  duration: number;
  transferSize: number;
  isLoader: boolean;
}

interface RecordedLongTask {
  key: string;
  startTime: number;
  duration: number;
  directlyAttributedToAdFrame: boolean;
}

interface AdActivity {
  at: number;
}

interface LongTaskAttributionLike {
  containerSrc?: string;
}

interface LongTaskEntryLike extends PerformanceEntry {
  attribution?: LongTaskAttributionLike[];
}

const AD_HOST_SUFFIXES = [
  "googlesyndication.com",
  "doubleclick.net",
  "googleadservices.com",
  "googletagservices.com",
] as const;
const ADSENSE_LOADER_PATH = "/pagead/js/adsbygoogle.js";
const AD_ACTIVITY_CORRELATION_WINDOW_MS = 2_000;
const MAX_RECORDED_ENTRIES = 250;

const slotHistory = new Map<string, Set<AdSlotLifecycleState>>();
const resources: RecordedResource[] = [];
const resourceKeys = new Set<string>();
const longTasks: RecordedLongTask[] = [];
const longTaskKeys = new Set<string>();
const adActivities: AdActivity[] = [];
const observers: PerformanceObserver[] = [];

let monitoringStarted = false;
let scriptState: AdScriptState = "not_scheduled";
let scriptResourceStart: number | null = null;
let scriptLoadedAt: number | null = null;

function now() {
  return typeof performance !== "undefined" ? performance.now() : 0;
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}

function addBounded<T>(items: T[], item: T) {
  items.push(item);
  if (items.length > MAX_RECORDED_ENTRIES) items.shift();
}

function noteAdActivity(at = now()) {
  addBounded(adActivities, { at });
}

export function getResourceHost(value: string | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value, typeof window !== "undefined" ? window.location.href : undefined).hostname
      .toLowerCase()
      .replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function isAdResourceUrl(value: string | undefined) {
  const host = getResourceHost(value);
  if (!host) return false;
  return AD_HOST_SUFFIXES.some((suffix) => host === suffix || host.endsWith(`.${suffix}`));
}

function isAdsenseLoader(value: string) {
  if (!isAdResourceUrl(value)) return false;
  try {
    return new URL(value).pathname.endsWith(ADSENSE_LOADER_PATH);
  } catch {
    return value.includes(ADSENSE_LOADER_PATH);
  }
}

function recordResource(entry: PerformanceResourceTiming) {
  if (!isAdResourceUrl(entry.name)) return;
  const key = `${entry.name}:${round(entry.startTime)}:${round(entry.duration)}`;
  if (resourceKeys.has(key)) return;
  resourceKeys.add(key);

  const responseEnd = entry.responseEnd || entry.startTime + entry.duration;
  const isLoader = isAdsenseLoader(entry.name);
  addBounded(resources, {
    key,
    startTime: entry.startTime,
    responseEnd,
    duration: entry.duration,
    transferSize: entry.transferSize,
    isLoader,
  });
  noteAdActivity(responseEnd);

  if (isLoader) {
    scriptResourceStart =
      scriptResourceStart === null
        ? entry.startTime
        : Math.min(scriptResourceStart, entry.startTime);
    if (scriptState === "scheduled") scriptState = "loading";
  }
}

function recordLongTask(entry: PerformanceEntry) {
  const longTask = entry as LongTaskEntryLike;
  const key = `${round(longTask.startTime)}:${round(longTask.duration)}`;
  if (longTaskKeys.has(key)) return;
  longTaskKeys.add(key);

  const directlyAttributedToAdFrame =
    longTask.attribution?.some((attribution) => isAdResourceUrl(attribution.containerSrc)) ?? false;
  addBounded(longTasks, {
    key,
    startTime: longTask.startTime,
    duration: longTask.duration,
    directlyAttributedToAdFrame,
  });
}

function observeEntryType(
  type: "resource" | "longtask",
  callback: (entry: PerformanceEntry) => void
) {
  if (typeof PerformanceObserver === "undefined") return;
  if (!PerformanceObserver.supportedEntryTypes?.includes(type)) return;

  try {
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach(callback);
    });
    observer.observe({ type, buffered: true });
    observers.push(observer);
  } catch {
    // Performance entry support differs by browser; unsupported observers are optional RUM data.
  }
}

export function startAdPerformanceMonitoring() {
  if (monitoringStarted || typeof window === "undefined") return;
  monitoringStarted = true;

  if (typeof performance !== "undefined") {
    performance
      .getEntriesByType("resource")
      .forEach((entry) => recordResource(entry as PerformanceResourceTiming));
  }

  observeEntryType("resource", (entry) => recordResource(entry as PerformanceResourceTiming));
  observeEntryType("longtask", recordLongTask);
}

export function markAdScriptScheduled() {
  startAdPerformanceMonitoring();
  if (scriptState === "not_scheduled") scriptState = "scheduled";
}

export function markAdScriptLoaded() {
  startAdPerformanceMonitoring();
  scriptState = "loaded";
  scriptLoadedAt = now();
  noteAdActivity(scriptLoadedAt);
}

export function markAdScriptError() {
  startAdPerformanceMonitoring();
  scriptState = "error";
  noteAdActivity();
}

export function markAdSlotState(slotKey: string, state: AdSlotLifecycleState) {
  startAdPerformanceMonitoring();
  const history = slotHistory.get(slotKey) ?? new Set<AdSlotLifecycleState>();
  history.add(state);
  slotHistory.set(slotKey, history);
  if (state !== "rendered") noteAdActivity();
}

function getActiveSlotHistories() {
  if (typeof document === "undefined") return [...slotHistory.entries()];
  const activeKeys = new Set(
    [...document.querySelectorAll<HTMLElement>("[data-ad-slot-key]")]
      .map((element) => element.dataset.adSlotKey)
      .filter((key): key is string => Boolean(key))
  );
  return [...slotHistory.entries()].filter(([key]) => activeKeys.has(key));
}

function countSlotsWith(
  histories: Array<[string, Set<AdSlotLifecycleState>]>,
  state: AdSlotLifecycleState
) {
  let count = 0;
  histories.forEach(([, history]) => {
    if (history.has(state)) count += 1;
  });
  return count;
}

function getDeliveryState(counts: {
  rendered: number;
  requested: number;
  filled: number;
  viewable: number;
  failed: number;
}): AdDeliveryState {
  if (counts.rendered === 0) return "no_slot";
  if (counts.viewable > 0) return "viewable";
  if (counts.filled > 0) return "filled";
  if (scriptState === "error" || counts.failed > 0) return "blocked_or_failed";
  if (counts.requested > 0) return "requested";
  return "slot_only";
}

function isTemporallyCorrelated(task: RecordedLongTask) {
  if (task.directlyAttributedToAdFrame) return true;
  const taskEnd = task.startTime + task.duration;
  return adActivities.some(
    (activity) =>
      task.startTime <= activity.at + AD_ACTIVITY_CORRELATION_WINDOW_MS && taskEnd >= activity.at
  );
}

function sumDuration(entries: Array<{ duration: number }>) {
  return entries.reduce((sum, entry) => sum + entry.duration, 0);
}

export function getAdPerformanceSnapshot(): AdPerformanceSnapshot {
  const activeSlotHistories = getActiveSlotHistories();
  const renderedSlotCount = countSlotsWith(activeSlotHistories, "rendered");
  const requestedSlotCount = countSlotsWith(activeSlotHistories, "requested");
  const filledSlotCount = countSlotsWith(activeSlotHistories, "filled");
  const viewableSlotCount = countSlotsWith(activeSlotHistories, "viewable");
  const failedSlotCount = new Set(
    activeSlotHistories
      .filter(([, history]) => history.has("unfilled") || history.has("timeout"))
      .map(([key]) => key)
  ).size;
  const directlyAttributedTasks = longTasks.filter((task) => task.directlyAttributedToAdFrame);
  const correlatedTasks = longTasks.filter(isTemporallyCorrelated);
  const transferredBytes = resources.reduce((sum, entry) => sum + entry.transferSize, 0);
  const scriptLoadMs =
    scriptResourceStart !== null && scriptLoadedAt !== null
      ? Math.max(0, scriptLoadedAt - scriptResourceStart)
      : null;

  return {
    scriptState,
    scriptLoadMs: scriptLoadMs === null ? null : round(scriptLoadMs),
    deliveryState: getDeliveryState({
      rendered: renderedSlotCount,
      requested: requestedSlotCount,
      filled: filledSlotCount,
      viewable: viewableSlotCount,
      failed: failedSlotCount,
    }),
    renderedSlotCount,
    requestedSlotCount,
    filledSlotCount,
    viewableSlotCount,
    failedSlotCount,
    adResourceCount: resources.length,
    adResourceDurationMs: round(sumDuration(resources)),
    // Cross-origin Resource Timing may expose 0 without Timing-Allow-Origin.
    adTransferKb: transferredBytes > 0 ? round(transferredBytes / 1024) : null,
    pageLongTaskCount: longTasks.length,
    pageLongTaskTotalMs: round(sumDuration(longTasks)),
    pageLongTaskMaxMs: round(Math.max(0, ...longTasks.map((task) => task.duration))),
    adFrameLongTaskCount: directlyAttributedTasks.length,
    adFrameLongTaskTotalMs: round(sumDuration(directlyAttributedTasks)),
    adCorrelatedLongTaskCount: correlatedTasks.length,
    adCorrelatedLongTaskTotalMs: round(sumDuration(correlatedTasks)),
  };
}
