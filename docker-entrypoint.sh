#!/bin/sh
# Applies any pending database migrations, then starts the app.
#
# Migrations run here rather than at image build time because the image is built
# in CI, where the database is not reachable. A failed migration stops the
# container before it serves anything, so a half-migrated schema is never live.
set -e

echo "==> applying database migrations"
node scripts/migrate.js

echo "==> starting Fight Club CRM"
exec "$@"
