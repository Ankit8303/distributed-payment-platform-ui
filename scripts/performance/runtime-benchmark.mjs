import { spawn } from "node:child_process";
import { performance } from "node:perf_hooks";

const baseUrl = process.env.PERF_BASE_URL || "http://127.0.0.1:3000";
const totalRequests = Number(process.env.PERF_REQUESTS || 200);
const concurrency = Number(process.env.PERF_CONCURRENCY || 20);
const maxP95Ms = Number(process.env.PERF_MAX_P95_MS || 500);
const maxP99Ms = Number(process.env.PERF_MAX_P99_MS || 1000);
const maxErrorRate = Number(process.env.PERF_MAX_ERROR_RATE || 0);
const startupTimeoutMs = Number(process.env.PERF_STARTUP_TIMEOUT_MS || 30000);

if (!Number.isInteger(totalRequests) || totalRequests < 1) throw new Error("PERF_REQUESTS must be a positive integer");
if (!Number.isInteger(concurrency) || concurrency < 1) throw new Error("PERF_CONCURRENCY must be a positive integer");
if (maxP95Ms <= 0 || maxP99Ms <= 0 || maxErrorRate < 0 || maxErrorRate > 1) {
  throw new Error("Performance thresholds are invalid");
}

const nextCli = process.platform === "win32"
  ? "./node_modules/next/dist/bin/next"
  : "./node_modules/next/dist/bin/next";
let server;
let startedHere = false;

async function probe(path) {
  const started = performance.now();
  const response = await fetch(new URL(path, baseUrl));
  const body = await response.text();
  const elapsedMs = performance.now() - started;
  return { response, body, elapsedMs };
}

async function waitForServer() {
  const deadline = performance.now() + startupTimeoutMs;
  while (performance.now() < deadline) {
    try {
      const result = await probe("/api/healthz");
      if (result.response.ok && result.body.includes('"status":"ok"')) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Production server did not become healthy within ${startupTimeoutMs}ms`);
}

async function runBenchmark(path) {
  const samples = [];
  let failures = 0;
  let nextIndex = 0;

  async function worker() {
    while (true) {
      const index = nextIndex++;
      if (index >= totalRequests) return;
      try {
        const result = await probe(path);
        samples.push(result.elapsedMs);
        if (!result.response.ok) failures++;
      } catch {
        failures++;
      }
    }
  }

  const started = performance.now();
  await Promise.all(Array.from({ length: Math.min(concurrency, totalRequests) }, worker));
  const durationMs = performance.now() - started;
  samples.sort((a, b) => a - b);

  const percentile = (p) => samples[Math.min(samples.length - 1, Math.ceil(samples.length * p) - 1)] ?? Infinity;
  return {
    path,
    requests: totalRequests,
    failures,
    errorRate: failures / totalRequests,
    p95Ms: percentile(0.95),
    p99Ms: percentile(0.99),
    requestsPerSecond: totalRequests / (durationMs / 1000),
    durationMs,
  };
}

function assertBudget(result) {
  console.log(JSON.stringify(result, null, 2));
  if (result.errorRate > maxErrorRate) {
    throw new Error(`${result.path}: error rate ${result.errorRate} exceeded ${maxErrorRate}`);
  }
  if (result.p95Ms > maxP95Ms) {
    throw new Error(`${result.path}: p95 ${result.p95Ms.toFixed(2)}ms exceeded ${maxP95Ms}ms`);
  }
  if (result.p99Ms > maxP99Ms) {
    throw new Error(`${result.path}: p99 ${result.p99Ms.toFixed(2)}ms exceeded ${maxP99Ms}ms`);
  }
}

async function stopServer() {
  if (!server || server.killed) return;
  server.kill("SIGTERM");
  await new Promise((resolve) => setTimeout(resolve, 1000));
  if (!server.killed) server.kill("SIGKILL");
}

async function main() {
  try {
    const startupStarted = performance.now();
    server = spawn(process.execPath, [nextCli, "start"], {
      env: { ...process.env, PORT: "3000", HOSTNAME: "127.0.0.1" },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    startedHere = true;

    server.stdout.on("data", (chunk) => process.stdout.write(`[server] ${chunk}`));
    server.stderr.on("data", (chunk) => process.stderr.write(`[server] ${chunk}`));

    await waitForServer();
    console.log(`Production startup: ${(performance.now() - startupStarted).toFixed(2)}ms`);

    const health = await probe("/api/healthz");
    const ready = await probe("/api/readyz");
    if (!health.response.ok || !health.body.includes('"status":"ok"')) throw new Error("healthz contract failed");
    if (!ready.response.ok || !ready.body.includes('"status":"ready"')) throw new Error("readyz contract failed");

    assertBudget(await runBenchmark("/api/healthz"));
    assertBudget(await runBenchmark("/api/readyz"));
    console.log("Phase 9 runtime performance gate passed.");
  } finally {
    if (startedHere) await stopServer();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
