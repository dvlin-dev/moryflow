#!/bin/sh
set -e

echo "🔄 Running database migrations (main)..."
prisma db push --schema=prisma/main/schema.prisma

echo "🔄 Running database migrations (vector)..."
prisma db push --schema=prisma/vector/schema.prisma

echo "🚀 Starting application..."
exec node dist/src/main.js
