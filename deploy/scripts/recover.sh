#!/usr/bin/env sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)"
ENV_FILE="${1:-$ROOT_DIR/deploy/.env.production}"
COMPOSE="docker compose --env-file $ENV_FILE -f $ROOT_DIR/deploy/docker-compose.yml"

[ -f "$ENV_FILE" ] || {
  echo "ERROR: production env file not found: $ENV_FILE" >&2
  exit 1
}

command -v docker >/dev/null 2>&1 || { echo "ERROR: Docker is required." >&2; exit 1; }
docker info >/dev/null 2>&1 || { echo "ERROR: Docker daemon is unavailable." >&2; exit 1; }
docker compose version >/dev/null 2>&1 || { echo "ERROR: Docker Compose v2 is required." >&2; exit 1; }

cd "$ROOT_DIR"
$COMPOSE restart frontend caddy

wait_for_health() {
  service="$1"
  for i in $(seq 1 30); do
    status="$($COMPOSE ps --format '{{.Service}} {{.Health}}' 2>/dev/null || true)"
    echo "$status"
    if printf '%s\n' "$status" | grep -q "^$service healthy$"; then
      return 0
    fi
    [ "$i" -eq 30 ] && return 1
    sleep 2
  done
}

wait_for_health frontend || {
  echo "ERROR: frontend did not recover to healthy state." >&2
  $COMPOSE logs --tail=100 frontend >&2 || true
  exit 1
}

wait_for_health caddy || {
  echo "ERROR: Caddy did not recover to healthy state." >&2
  $COMPOSE logs --tail=100 caddy >&2 || true
  exit 1
}

echo "Recovery verification passed."
$COMPOSE ps
