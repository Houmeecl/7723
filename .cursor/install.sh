#!/usr/bin/env bash
# Cloud Agent install script for NotaryVecino.
# Idempotent: refreshes dependencies, builds the client SPA, and provisions the DB.
set -euo pipefail
cd "$(dirname "$0")/.."

# 1. System dependency: PostgreSQL server.
if ! command -v psql >/dev/null 2>&1; then
  sudo apt-get update -y
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y postgresql postgresql-contrib
fi

# 2. Node dependencies (root server + client SPA).
#    --legacy-peer-deps because drizzle-zod is pinned to the drizzle-orm 0.28 line.
npm install --legacy-peer-deps
( cd client && npm install )

# 3. Build the client SPA and stage it so the API server can serve it same-origin
#    on port 5000 (this is also the Vercel production build).
( cd client && npm run build )
rm -rf dist/public
mkdir -p dist/public
cp -r client/dist/. dist/public/

# 4. Provision the local database (role, database, schema).
bash .cursor/setup-db.sh

echo "[install] NotaryVecino environment ready"
