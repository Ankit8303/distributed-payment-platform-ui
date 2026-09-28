#!/usr/bin/env sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)"
ENV_FILE="${1:-$ROOT_DIR/deploy/.env.production}"

[ -f "$ENV_FILE" ] || {
  echo "ERROR: production env file not found: $ENV_FILE" >&2
  echo "Copy deploy/.env.production.example to deploy/.env.production and set real public values." >&2
  exit 1
}

command -v docker >/dev/null 2>&1 || { echo "ERROR: Docker is required." >&2; exit 1; }
docker info >/dev/null 2>&1 || { echo "ERROR: Docker daemon is unavailable." >&2; exit 1; }
docker compose version >/dev/null 2>&1 || { echo "ERROR: Docker Compose v2 is required." >&2; exit 1; }

cd "$ROOT_DIR"
docker compose --env-file "$ENV_FILE" -f deploy/docker-compose.yml config >/dev/null
node ./scripts/deployment/verify-production-config.mjs "$ENV_FILE"

docker compose --env-file "$ENV_FILE" -f deploy/docker-compose.yml build --pull frontend
docker compose --env-file "$ENV_FILE" -f deploy/docker-compose.yml up -d --remove-orphans

echo "Waiting for frontend health..."
for i in $(seq 1 30); do
  status="$(docker compose --env-file "$ENV_FILE" -f deploy/docker-compose.yml ps --format '{{.Service}} {{.Health}}' 2>/dev/null || true)"
  echo "$status"
  if printf '%s\n' "$status" | grep -q '^frontend healthy$'; then
    break
  fi
  [ "$i" -eq 30 ] && {
    echo "ERROR: frontend did not become healthy." >&2
    docker compose --env-file "$ENV_FILE" -f deploy/docker-compose.yml logs --tail=100 frontend >&2 || true
    exit 1
  }
  sleep 2
done

docker compose --env-file "$ENV_FILE" -f deploy/docker-compose.yml up -d caddy

echo "Waiting for Caddy health..."
for i in $(seq 1 30); do
  status="$(docker compose --env-file "$ENV_FILE" -f deploy/docker-compose.yml ps --format '{{.Service}} {{.Health}}' 2>/dev/null || true)"
  echo "$status"
  if printf '%s\n' "$status" | grep -q '^caddy healthy$'; then
    break
  fi
  [ "$i" -eq 30 ] && {
    echo "ERROR: Caddy did not become healthy." >&2
    docker compose --env-file "$ENV_FILE" -f deploy/docker-compose.yml logs --tail=100 caddy >&2 || true
    exit 1
  }
  sleep 2
done

echo "Deployment started successfully."
docker compose --env-file "$ENV_FILE" -f deploy/docker-compose.yml ps
