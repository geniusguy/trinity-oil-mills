#!/usr/bin/env bash

set -euo pipefail

# Usage:
#   DB_USER=your_user DB_PASS=your_pass DB_NAME=your_db_name \
#   DB_HOST=localhost DB_PORT=3306 ./backup-db.sh
#
# This will create: db-backup_<DB_NAME>_<YYYYMMDD_HHMMSS>.sql

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:?Please set DB_USER}"
DB_PASS="${DB_PASS:?Please set DB_PASS}"
DB_NAME="${DB_NAME:?Please set DB_NAME}"

TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
OUT_FILE="db-backup_${DB_NAME}_${TIMESTAMP}.sql"

echo "Creating MySQL backup for database '${DB_NAME}' on ${DB_HOST}:${DB_PORT}..."

mysqldump -h "${DB_HOST}" -P "${DB_PORT}" -u "${DB_USER}" -p"${DB_PASS}" "${DB_NAME}" > "${OUT_FILE}"

echo "✅ Backup completed: ${OUT_FILE}"

