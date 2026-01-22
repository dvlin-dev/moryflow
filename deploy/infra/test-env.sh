#!/bin/bash
# [INPUT]: deploy/infra/docker-compose.test.yml
# [OUTPUT]: 启动/停止/查看测试环境容器状态
# [POS]: 本地测试环境管理脚本
# [PROTOCOL]: 本文件变更时，需同步更新 docs/code-review/deploy-infra.md 与 docs/code-review/index.md
#
# 测试环境管理脚本

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.test.yml"
HEALTH_TIMEOUT_SECONDS=60

wait_for_healthy() {
  local service="$1"
  local start_time
  start_time=$(date +%s)

  while true; do
    local container_id
    container_id=$(docker compose -f "$COMPOSE_FILE" ps -q "$service")
    if [ -n "$container_id" ]; then
      local status
      status=$(docker inspect -f '{{.State.Health.Status}}' "$container_id" 2>/dev/null || true)
      if [ "$status" = "healthy" ]; then
        return 0
      fi
    fi

    if [ $(( $(date +%s) - start_time )) -ge "$HEALTH_TIMEOUT_SECONDS" ]; then
      echo "Timed out waiting for $service to be healthy."
      return 1
    fi

    sleep 2
  done
}

case "$1" in
  start)
    echo "Starting test containers..."
    docker compose -f "$COMPOSE_FILE" up -d
    echo "Waiting for services to be healthy..."
    wait_for_healthy postgres-test
    wait_for_healthy vector-postgres-test
    wait_for_healthy redis-test
    echo "Test environment ready!"
    echo "  PostgreSQL: localhost:5433"
    echo "  Vector PostgreSQL: localhost:5434"
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
