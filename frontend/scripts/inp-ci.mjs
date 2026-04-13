#!/usr/bin/env node
// INP 회귀 차단 — CI 진입점
// inp-benchmark.mjs를 실행하고 p95가 threshold를 넘으면 exit 1
// GitHub Actions Step Summary 출력
import { execSync } from "node:child_process";
import { writeFileSync, appendFileSync, existsSync } from "node:fs";

const THRESHOLD_MS = Number(process.env.INP_THRESHOLD_MS ?? 200);
const RUNS = Number(process.env.RUNS ?? 5);
const CPU_THROTTLE = Number(process.env.CPU_THROTTLE ?? 6);
const URL = process.env.BENCH_URL ?? "http://localhost:3000/synergy-detail";

console.log(`\n▶ INP CI gate`);
console.log(`  url=${URL}`);
console.log(`  threshold (p95) <= ${THRESHOLD_MS}ms`);
console.log(`  runs=${RUNS} throttle=${CPU_THROTTLE}x\n`);

let stdout;
try {
  stdout = execSync(
    `node scripts/inp-benchmark.mjs ci-gate`,
    {
      env: { ...process.env, RUNS: String(RUNS), CPU_THROTTLE: String(CPU_THROTTLE), BENCH_URL: URL },
      stdio: "pipe",
      encoding: "utf-8",
    }
  );
} catch (err) {
  console.error("❌ INP benchmark failed to run:");
  console.error(err.stdout || err.message);
  process.exit(2);
}

console.log(stdout);

// AGGREGATE 라인에서 p95 추출
const aggLine = stdout.split("\n").find((l) => l.startsWith("AGGREGATE"));
const m = aggLine?.match(/p95=([\d.]+)ms/);
if (!m) {
  console.error("❌ Could not parse AGGREGATE p95 from output.");
  process.exit(2);
}
const p95 = Number(m[1]);
const median = Number(aggLine.match(/median=([\d.]+)ms/)?.[1] ?? "NaN");
const max = Number(aggLine.match(/max=([\d.]+)ms/)?.[1] ?? "NaN");
const passed = p95 <= THRESHOLD_MS;

const summary = [
  `## 🎯 INP Bench Gate`,
  ``,
  `| Metric | Value | Threshold | Status |`,
  `|--------|-------|-----------|--------|`,
  `| **p95** | ${p95.toFixed(1)}ms | ≤ ${THRESHOLD_MS}ms | ${passed ? "✅" : "❌"} |`,
  `| median | ${median.toFixed(1)}ms | – | – |`,
  `| max | ${max.toFixed(1)}ms | – | – |`,
  ``,
  `**URL**: \`${URL}\`  `,
  `**CPU throttle**: ${CPU_THROTTLE}x  `,
  `**Runs**: ${RUNS}`,
  ``,
].join("\n");

console.log("\n" + summary);

// GitHub Actions step summary
if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary + "\n");
}

// 결과를 JSON 아티팩트로 저장
writeFileSync(
  "inp-ci-result.json",
  JSON.stringify({ url: URL, threshold: THRESHOLD_MS, p95, median, max, passed, runs: RUNS, throttle: CPU_THROTTLE }, null, 2)
);

if (!passed) {
  console.error(`\n❌ INP regression: p95 ${p95}ms > threshold ${THRESHOLD_MS}ms`);
  process.exit(1);
}
console.log(`\n✅ INP within budget (p95 ${p95}ms ≤ ${THRESHOLD_MS}ms)`);
