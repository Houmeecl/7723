#!/usr/bin/env bash
# Run the NotaryVecino Express API + built client SPA on port 5000 (same-origin).
# Uses the dev-with-db wrapper, which runs a local WebSocket<->TCP relay so the
# @neondatabase/serverless driver can talk to the local Postgres.
set -euo pipefail
cd "$(dirname "$0")/.."
export NODE_ENV=production
export TSX_TSCONFIG_PATH=.cursor/tsconfig.dev.json
exec ./node_modules/.bin/tsx .cursor/dev-with-db.mjs
