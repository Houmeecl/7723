#!/usr/bin/env bash
# Per-boot start command: ensure PostgreSQL is running and the database is ready.
# Returns once the database is available so the terminals can start cleanly.
set -euo pipefail
cd "$(dirname "$0")/.."
bash .cursor/setup-db.sh
