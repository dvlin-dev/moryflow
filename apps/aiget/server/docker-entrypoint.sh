#!/bin/sh
set -e

echo "🔄 Running database migrations..."
prisma db push

echo "🚀 Starting application..."
exec node dist/src/main.js
