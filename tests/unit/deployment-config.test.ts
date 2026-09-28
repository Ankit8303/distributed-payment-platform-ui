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
    expect(compose).toContain("restart: unless-stopped");
    expect(compose).toContain('"80:80"');
    expect(compose).toContain('"443:443"');
    expect(caddy).toContain("reverse_proxy frontend:3000");
    expect(caddy).toContain("encode gzip zstd");
  });

  it("enforces container resource and privilege boundaries", () => {
    const compose = fs.readFileSync(path.join(root, "deploy/docker-compose.yml"), "utf8");

    expect(compose).toContain("read_only: true");
    expect(compose).toContain("cap_drop:");
    expect(compose).toContain("no-new-privileges:true");
    expect(compose).toContain("pids_limit:");
    expect(compose).toContain("mem_limit:");
    expect(compose).toContain("cpus:");
    expect(compose).toContain('max-size: "10m"');
  });

  it("defines runtime health signals for both production services", () => {
    const compose = fs.readFileSync(path.join(root, "deploy/docker-compose.yml"), "utf8");

    expect(compose).toContain("http://127.0.0.1:3000/api/healthz");
    expect(compose).toContain("http://127.0.0.1:2019/config/");
    expect((compose.match(/healthcheck:/g) || []).length).toBeGreaterThanOrEqual(2);
  });

  it("keeps production configuration free of application secrets", () => {
    const envExample = fs.readFileSync(path.join(root, "deploy/.env.production.example"), "utf8");
    expect(envExample).not.toMatch(/(SECRET|PASSWORD|TOKEN|PRIVATE_KEY|API_KEY)=/i);
  });

  it("ships executable host, deployment, and recovery gates", () => {
    const preflight = fs.readFileSync(path.join(root, "deploy/scripts/preflight.sh"), "utf8");
    const deploy = fs.readFileSync(path.join(root, "deploy/scripts/deploy.sh"), "utf8");
    const recover = fs.readFileSync(path.join(root, "deploy/scripts/recover.sh"), "utf8");

    expect(preflight).toContain("docker compose version");
    expect(preflight).toContain("docker info");
    expect(deploy).toContain("docker compose");
    expect(deploy).toContain("verify-production-config.mjs");
    expect(deploy).toContain("frontend healthy");
    expect(deploy).toContain("caddy healthy");
    expect(recover).toContain("restart frontend caddy");
    expect(recover).toContain("Recovery verification passed.");
  });

  it("ships an executable deployment configuration gate", () => {
    const validator = fs.readFileSync(path.join(root, "scripts/deployment/verify-production-config.mjs"), "utf8");
    expect(validator).toContain("NEXT_PUBLIC_API_URL");
    expect(validator).toContain("https:");
    expect(validator).toContain("DOMAIN");
  });
});
