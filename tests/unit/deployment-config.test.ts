import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

describe("production deployment contract", () => {
  it("defines a portable frontend and HTTPS reverse proxy", () => {
    const compose = fs.readFileSync(path.join(root, "deploy/docker-compose.yml"), "utf8");
    const caddy = fs.readFileSync(path.join(root, "deploy/caddy/Caddyfile"), "utf8");

    expect(compose).toContain("NEXT_PUBLIC_API_URL");
    expect(compose).toContain("condition: service_healthy");
    expect(compose).toContain('restart: unless-stopped');
    expect(compose).toContain('"80:80"');
    expect(compose).toContain('"443:443"');
    expect(caddy).toContain("reverse_proxy frontend:3000");
    expect(caddy).toContain("encode gzip zstd");
  });

  it("keeps production configuration free of application secrets", () => {
    const envExample = fs.readFileSync(path.join(root, "deploy/.env.production.example"), "utf8");
    expect(envExample).not.toMatch(/(SECRET|PASSWORD|TOKEN|PRIVATE_KEY|API_KEY)=/i);
  });

  it("ships an executable deployment configuration gate", () => {
    const validator = fs.readFileSync(path.join(root, "scripts/deployment/verify-production-config.mjs"), "utf8");
    expect(validator).toContain("NEXT_PUBLIC_API_URL");
    expect(validator).toContain("https:");
    expect(validator).toContain("DOMAIN");
  });
});
