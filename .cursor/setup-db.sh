#!/usr/bin/env bash
# Idempotent local Postgres setup for NotaryVecino.
# Starts the cluster, ensures the role/database referenced by DATABASE_URL exist,
# and applies the schema. Safe to run on every boot.
set -euo pipefail
cd "$(dirname "$0")/.."

# Start the PostgreSQL 16 cluster if it is not already running.
sudo pg_ctlcluster 16 main start 2>/dev/null || true

# Wait for Postgres to accept connections.
for _ in $(seq 1 30); do
  pg_isready -h 127.0.0.1 -p 5432 >/dev/null 2>&1 && break
  sleep 1
done

# Role + database matching DATABASE_URL (user:password@localhost:5432/notaryvecino).
sudo -u postgres psql -v ON_ERROR_STOP=1 -c \
  "DO \$\$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='user') THEN CREATE ROLE \"user\" LOGIN PASSWORD 'password' SUPERUSER; END IF; END \$\$;"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='notaryvecino'" \
  | grep -q 1 || sudo -u postgres createdb -O "user" notaryvecino

# Apply the Drizzle schema the first time (detected by absence of the users table).
if ! PGPASSWORD=password psql -h 127.0.0.1 -U user -d notaryvecino -tAc \
      "SELECT to_regclass('public.users')" | grep -q users; then
  PGPASSWORD=password psql -h 127.0.0.1 -U user -d notaryvecino -v ON_ERROR_STOP=1 \
    -f migrations/0000_narrow_peter_parker.sql
fi

# Reconcile the users table with the extra columns server/db.ts expects (idempotent).
PGPASSWORD=password psql -h 127.0.0.1 -U user -d notaryvecino -v ON_ERROR_STOP=1 -c \
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS platform varchar(50) DEFAULT 'notary'; \
   ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT now();"

echo "[setup-db] PostgreSQL ready: notaryvecino"
