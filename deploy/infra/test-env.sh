#!/bin/bash
# 测试环境管理脚本

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.test.yml"

case "$1" in
  start)
    echo "Starting test containers..."
    docker compose -f "$COMPOSE_FILE" up -d
    echo "Waiting for services to be healthy..."
    sleep 5
    echo "Test environment ready!"
    echo "  PostgreSQL: localhost:5433"
    echo "  Redis: localhost:6380"
    ;;
  stop)
    echo "Stopping test containers..."
    docker compose -f "$COMPOSE_FILE" down
    echo "Test environment stopped."
    ;;
  restart)
    $0 stop
    $0 start
    ;;
  logs)
    docker compose -f "$COMPOSE_FILE" logs -f
    ;;
  status)
    docker compose -f "$COMPOSE_FILE" ps
    ;;
  clean)
    echo "Stopping and removing test containers with volumes..."
    docker compose -f "$COMPOSE_FILE" down -v
    echo "Test environment cleaned."
    ;;
  *)
    echo "Usage: $0 {start|stop|restart|logs|status|clean}"
    exit 1
    ;;
esac
