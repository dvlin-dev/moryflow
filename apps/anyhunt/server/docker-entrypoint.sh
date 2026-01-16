#!/bin/sh
set -e

echo "🔄 Running database migrations (main)..."
prisma migrate deploy --config prisma.main.config.ts

echo "🔄 Running database migrations (vector)..."
prisma migrate deploy --config prisma.vector.config.ts

echo "🚀 Starting application..."
exec node dist/src/main.js
