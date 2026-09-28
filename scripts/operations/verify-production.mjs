const baseUrl = process.argv[2];

if (!baseUrl) {
  console.error("Usage: node scripts/operations/verify-production.mjs <base-url>");
  process.exit(2);
}

let origin;
try { origin = new URL(baseUrl); }
catch { console.error("ERROR: base URL must be an absolute HTTP(S) URL."); process.exit(1); }

const isLoopback = ["localhost", "127.0.0.1", "::1"].includes(origin.hostname);
if (origin.protocol !== "https:" && !(origin.protocol === "http:" && isLoopback)) {
  console.error("ERROR: production verification requires HTTPS; HTTP is allowed only for loopback smoke tests.");
  process.exit(1);
}

origin.pathname = "";
origin.search = "";
origin.hash = "";
const base = origin.toString().replace(/\/$/, "");
const timeoutMs = 10_000;

async function fetchWithTimeout(path) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(`${base}${path}`, { redirect: "manual", cache: "no-store", signal: controller.signal });
  } finally { clearTimeout(timeout); }
}

function requireHeader(headers, name, predicate, message) {
  const value = headers.get(name);
  if (!value || !predicate(value)) throw new Error(message);
}

async function verifyJsonEndpoint(path, expectedStatus, expectedBody) {
  const response = await fetchWithTimeout(path);
  if (response.status !== expectedStatus) throw new Error(`${path} returned HTTP ${response.status}; expected ${expectedStatus}.`);
  const body = await response.json();
  if (body?.status !== expectedBody) throw new Error(`${path} returned an unexpected status payload.`);
  requireHeader(response.headers, "cache-control", value => /no-store/i.test(value), `${path} must disable caching.`);
}

try {
  await verifyJsonEndpoint("/api/healthz", 200, "ok");
  await verifyJsonEndpoint("/api/readyz", 200, "ready");

  const root = await fetchWithTimeout("/");
  if (root.status !== 200) throw new Error(`/ returned HTTP ${root.status}; expected 200.`);

  requireHeader(root.headers, "strict-transport-security", value => /max-age=/i.test(value), "Strict-Transport-Security header is missing or invalid.");
  requireHeader(root.headers, "x-content-type-options", value => value.toLowerCase() === "nosniff", "X-Content-Type-Options must be nosniff.");
  requireHeader(root.headers, "content-security-policy", value => /object-src 'none'/i.test(value) && !/unsafe-eval/i.test(value), "Content-Security-Policy is missing required restrictions.");

  console.log(`Production smoke verification passed: ${base}`);
} catch (error) {
  console.error(`Production smoke verification failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
