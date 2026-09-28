#!/usr/bin/env sh
set -eu

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

command -v docker >/dev/null 2>&1 || fail "Docker is not installed."
docker info >/dev/null 2>&1 || fail "Docker daemon is unavailable or the current user cannot access it."
docker compose version >/dev/null 2>&1 || fail "Docker Compose v2 is required."

[ "${EUID:-0}" -eq 0 ] && echo "WARNING: running as root; prefer a dedicated non-root Docker user." >&2

for port in 80 443; do
  if command -v ss >/dev/null 2>&1 && ss -ltn "( sport = :$port )" | grep -q ":$port"; then
    echo "WARNING: TCP port $port is already listening. Caddy may not be able to bind it." >&2
  fi
done

free_kb="$(awk '/MemAvailable:/ {print $2}' /proc/meminfo 2>/dev/null || echo 0)"
[ "$free_kb" -ge 524288 ] || echo "WARNING: less than 512 MiB memory appears available; deployment may be resource constrained." >&2

disk_avail_kb="$(df -Pk . | awk 'NR==2 {print $4}')"
[ "${disk_avail_kb:-0}" -ge 2097152 ] || echo "WARNING: less than 2 GiB free disk space is available." >&2

echo "VPS preflight checks passed."
