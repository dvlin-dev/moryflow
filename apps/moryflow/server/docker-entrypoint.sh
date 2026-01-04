#!/bin/sh
set -e

echo "🔄 Running database migrations..."
prisma migrate deploy

echo "🚀 Starting application..."
exec node dist/src/main.js
