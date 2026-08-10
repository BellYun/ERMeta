#!/usr/bin/env node
/* eslint-disable no-console */
// 모바일 연속 선택 nightly benchmark 진입점.
// 실제 사용자 INP가 아니라 고정된 lab interaction 시나리오의 추이를 기록한다.
import { spawnSync } from "node:child_process";
import { readFileSync, unlinkSync, writeFileSync, appendFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const RUNS = Number(process.env.RUNS ?? 30);
const WARMUP_RUNS = Number(process.env.WARMUP_RUNS ?? 2);
const CPU_THROTTLE = Number(process.env.CPU_THROTTLE ?? 6);
const INTER_TAP_MS = Number(process.env.INTER_TAP_MS ?? 50);
const URL = process.env.BENCH_URL ?? "http://localhost:3000/synergy-detail";
const HARD_GATE = process.env.PERF_HARD_GATE === "1";
const OUTPUT_PATH = process.env.CI_OUTPUT_PATH ?? "inp-ci-result.json";
const parseOptionalNumber = (value) => (value == null || value === "" ? null : Number(value));
const INTERACTION_THRESHOLD_MS = parseOptionalNumber(process.env.MOBILE_INTERACTION_THRESHOLD_MS);
const SELECTION_THRESHOLD_MS = parseOptionalNumber(process.env.MOBILE_SELECTION_THRESHOLD_MS);
const RESULT_THRESHOLD_MS = parseOptionalNumber(process.env.MOBILE_RESULT_THRESHOLD_MS);
const OVERLAP_LONG_TASK_RUNS_MAX = parseOptionalNumber(
  process.env.MOBILE_OVERLAP_LONG_TASK_RUNS_MAX
);
const rawOutputPath = join(tmpdir(), `ermeta-mobile-interaction-${process.pid}.json`);

console.log("\n▶ Mobile interaction benchmark report");
console.log(`  url=${URL}`);
console.log(
  `  warmups=${WARMUP_RUNS} runs=${RUNS} throttle=${CPU_THROTTLE}x interval=${INTER_TAP_MS}ms`
);

const benchmark = spawnSync(
  process.execPath,
  ["scripts/inp-interaction-benchmark.mjs", `nightly-${INTER_TAP_MS}ms`],
  {
    env: {
      ...process.env,
      RUNS: String(RUNS),
      WARMUP_RUNS: String(WARMUP_RUNS),
      CPU_THROTTLE: String(CPU_THROTTLE),
      BENCH_URL: URL,
      OUTPUT_PATH: rawOutputPath,
    },
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  }
);

if (benchmark.stdout) process.stdout.write(benchmark.stdout);
if (benchmark.stderr) process.stderr.write(benchmark.stderr);
if (benchmark.status !== 0) {
  console.error(`❌ Mobile interaction benchmark failed with exit ${benchmark.status}`);
  process.exit(2);
}

let raw;
try {
  raw = JSON.parse(readFileSync(rawOutputPath, "utf8"));
} finally {
  try {
    unlinkSync(rawOutputPath);
  } catch {}
}

const metrics = {
  interactionP95: raw.summary?.p95,
  selectionP95: raw.selectionFeedback?.second?.p95,
  resultUpdateP95: raw.resultUpdate?.p95,
  overlapLongTaskRuns: raw.interactionLongTasks?.runsWithLongTasks,
};
const checks = [
  {
    name: "interaction p95",
    value: metrics.interactionP95,
    threshold: INTERACTION_THRESHOLD_MS,
    unit: "ms",
  },
  {
    name: "DOM selection p95",
    value: metrics.selectionP95,
    threshold: SELECTION_THRESHOLD_MS,
    unit: "ms",
  },
  {
    name: "result update p95",
    value: metrics.resultUpdateP95,
    threshold: RESULT_THRESHOLD_MS,
    unit: "ms",
  },
  {
    name: "runs with overlapping Long Task",
    value: metrics.overlapLongTaskRuns,
    threshold: OVERLAP_LONG_TASK_RUNS_MAX,
    unit: "",
  },
]
  .filter((check) => Number.isFinite(check.threshold))
  .map((check) => ({
    ...check,
    passed: Number.isFinite(check.value) && check.value <= check.threshold,
  }));
const withinReferences = checks.length > 0 ? checks.every((check) => check.passed) : null;

if (HARD_GATE && checks.length === 0) {
  console.error("❌ PERF_HARD_GATE=1 requires at least one explicit threshold");
  process.exit(2);
}

const summary = [
  `## Mobile interaction benchmark (${INTER_TAP_MS}ms interval)`,
  "",
  "| Metric | Value |",
  "|---|---:|",
  `| interaction p95 | ${Number(metrics.interactionP95).toFixed(1)}ms |`,
  `| DOM selection p95 | ${Number(metrics.selectionP95).toFixed(1)}ms |`,
  `| full-result marker p95 | ${Number(metrics.resultUpdateP95).toFixed(1)}ms |`,
  `| runs with overlapping Long Task | ${Number(metrics.overlapLongTaskRuns).toFixed(0)} |`,
  ...(checks.length > 0
    ? [
        "",
        "### Explicit reference checks",
        "",
        "| Metric | Value | Reference | Status |",
        "|---|---:|---:|:---:|",
        ...checks.map(
          (check) =>
            `| ${check.name} | ${Number(check.value).toFixed(1)}${check.unit} | ≤ ${check.threshold}${check.unit} | ${check.passed ? "✅" : "⚠️"} |`
        ),
      ]
    : []),
  "",
  `- URL: \`${URL}\``,
  `- CPU throttle: ${CPU_THROTTLE}x`,
  `- Runs: ${RUNS}`,
  `- Warm-up runs: ${WARMUP_RUNS}`,
  `- Scenario: first full-result commit + ${INTER_TAP_MS}ms → second character/weapon tap`,
  "- Scope: lab Event Timing, not field INP",
  `- Mode: ${HARD_GATE ? "hard gate" : "report only"}`,
  "",
].join("\n");

console.log(`\n${summary}`);
if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`);
}

writeFileSync(
  OUTPUT_PATH,
  `${JSON.stringify(
    {
      url: URL,
      runs: RUNS,
      cpuThrottle: CPU_THROTTLE,
      interTapMs: INTER_TAP_MS,
      metrics,
      references: {
        interactionP95: INTERACTION_THRESHOLD_MS,
        selectionP95: SELECTION_THRESHOLD_MS,
        resultUpdateP95: RESULT_THRESHOLD_MS,
        overlapLongTaskRuns: OVERLAP_LONG_TASK_RUNS_MAX,
      },
      hardGate: HARD_GATE,
      withinReferences,
      checks,
    },
    null,
    2
  )}\n`
);

if (HARD_GATE && !withinReferences) {
  console.error("❌ Mobile interaction hard gate failed");
  process.exit(1);
}
if (withinReferences === false) {
  console.warn(
    "⚠️ One or more explicit references were exceeded; report retained without failing CI"
  );
} else {
  console.log("✅ Mobile interaction benchmark report written");
}
