#!/bin/sh
set -e

MODE="${ANYHUNT_RUN_MODE:-api}"
RUN_MIGRATIONS="${ANYHUNT_RUN_MIGRATIONS:-true}"

is_truthy() {
  case "$1" in
    1|true|TRUE|yes|YES|on|ON) return 0 ;;
    *) return 1 ;;
  esac
}

if is_truthy "$RUN_MIGRATIONS"; then
  echo "🔄 Running database migrations (main)..."
  prisma migrate deploy --config prisma.main.config.ts

  echo "🔄 Running database migrations (vector)..."
  prisma migrate deploy --config prisma.vector.config.ts
else
  echo "ℹ️  Skipping database migrations (ANYHUNT_RUN_MIGRATIONS=${RUN_MIGRATIONS})"
fi

case "$MODE" in
  api)
    echo "🚀 Starting application (api)..."
    exec node dist/src/main.js
    ;;
  video-transcript-worker)
    echo "🚀 Starting worker (video-transcript-worker)..."
    exec node dist/src/video-transcript/worker.js
    ;;
  *)
    echo "❌ Unknown ANYHUNT_RUN_MODE: ${MODE}"
    exit 1
    ;;
esac
