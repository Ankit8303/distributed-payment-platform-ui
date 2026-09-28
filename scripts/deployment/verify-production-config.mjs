import fs from "node:fs";

const envFile = process.argv[2] || "deploy/.env.production.example";
const text = fs.readFileSync(envFile, "utf8");
const values = {};

for (const rawLine of text.split(/\r?\n/)) {
  const line = rawLine.trim();
  if (!line || line.startsWith("#")) continue;
  const index = line.indexOf("=");
  if (index <= 0) continue;
  const key = line.slice(0, index).trim();
  const value = line.slice(index + 1).trim().replace(/^["']|["']$/g, "");
  values[key] = value;
}

const failures = [];
const domain = values.DOMAIN;
const apiUrl = values.NEXT_PUBLIC_API_URL;

if (!domain) failures.push("DOMAIN is required.");
if (domain && (/localhost$/i.test(domain) || domain.includes("..") || /[/:#@]/.test(domain))) {
  failures.push("DOMAIN must be a hostname without a scheme, path, port, credentials, or fragment.");
}
if (domain && !domain.includes(".")) failures.push("DOMAIN must be a fully qualified hostname.");

if (!apiUrl) {
  failures.push("NEXT_PUBLIC_API_URL is required.");
} else {
  try {
    const url = new URL(apiUrl);
    if (url.protocol !== "https:") failures.push("NEXT_PUBLIC_API_URL must use HTTPS.");
    if (url.username || url.password || url.hash) failures.push("NEXT_PUBLIC_API_URL must not contain credentials or fragments.");
    if (["localhost", "127.0.0.1", "0.0.0.0", "::1", "::"].includes(url.hostname)) {
      failures.push("NEXT_PUBLIC_API_URL must not target a local/loopback address.");
    }
  } catch {
    failures.push("NEXT_PUBLIC_API_URL must be an absolute URL.");
  }
}

if (failures.length) {
  console.error("Production deployment configuration validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Production deployment configuration valid: ${envFile}`);
