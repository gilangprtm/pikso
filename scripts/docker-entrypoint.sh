#!/bin/sh
set -eu

# Abort startup on any DB/bootstrap failure. Never print env values/secrets.
echo "Running database migrations..."
node /app/bootstrap/scripts/migrate.js

echo "Ensuring bootstrap admin account..."
node /app/bootstrap/scripts/create-admin.js

echo "Starting Pikso web server..."
exec "$@"
