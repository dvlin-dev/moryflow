#!/usr/bin/env bash
#
# [INPUT]: Mac mini 本机仓库路径 + Whisper 模型路径 + 可选节点标识
# [OUTPUT]: .env.local-worker + launchd plist + 常驻 local-worker 服务
# [POS]: Video Transcript local-worker 一键部署脚本（Mac mini）
#
# [PROTOCOL]: 本文件变更时，必须同步更新 apps/anyhunt/server/CLAUDE.md

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT_DEFAULT="$(cd "${SCRIPT_DIR}/../../../../.." && pwd)"

REPO_ROOT="${REPO_ROOT_DEFAULT}"
SERVER_DIR=""
ENV_FILE=""
MODEL_PATH=""
NODE_ID="$(hostname)"
SERVICE_LABEL="com.anyhunt.video-transcript-local-worker"
LOG_DIR="${HOME}/Library/Logs/anyhunt"
SKIP_DEP_INSTALL="false"
SKIP_BUILD="false"
NO_START="false"

print_usage() {
  cat <<'EOF'
用途：
  在 Mac mini 上为 Video Transcript local-worker 生成并启动 launchd 常驻服务。

用法：
  setup-local-worker.sh --model-path /ABSOLUTE/PATH/TO/model.bin [options]

参数：
  --model-path <path>      Whisper 模型绝对路径（必填，除非 .env.local-worker 已有）
  --repo-root <path>       仓库根目录（默认：脚本自动推断）
  --env-file <path>        local worker 环境文件路径（默认：apps/anyhunt/server/.env.local-worker）
  --node-id <id>           本地节点标识（默认：hostname）
  --service-label <label>  launchd 服务名（默认：com.anyhunt.video-transcript-local-worker）
  --log-dir <path>         日志目录（默认：~/Library/Logs/anyhunt）
  --skip-dep-install       跳过 brew 依赖安装检查
  --skip-build             跳过 pnpm build
  --no-start               仅生成文件，不执行 launchctl 启动
  -h, --help               显示帮助
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --model-path)
      MODEL_PATH="${2:-}"
      shift 2
      ;;
    --repo-root)
      REPO_ROOT="${2:-}"
      shift 2
      ;;
    --env-file)
      ENV_FILE="${2:-}"
      shift 2
      ;;
    --node-id)
      NODE_ID="${2:-}"
      shift 2
      ;;
    --service-label)
      SERVICE_LABEL="${2:-}"
      shift 2
      ;;
    --log-dir)
      LOG_DIR="${2:-}"
      shift 2
      ;;
    --skip-dep-install)
      SKIP_DEP_INSTALL="true"
      shift
      ;;
    --skip-build)
      SKIP_BUILD="true"
      shift
      ;;
    --no-start)
      NO_START="true"
      shift
      ;;
    -h|--help)
      print_usage
      exit 0
      ;;
    *)
      echo "[ERROR] 未知参数: $1"
      print_usage
      exit 1
      ;;
  esac
done

SERVER_DIR="${REPO_ROOT}/apps/anyhunt/server"
if [[ -z "${ENV_FILE}" ]]; then
  ENV_FILE="${SERVER_DIR}/.env.local-worker"
fi

LAUNCH_DIR="${HOME}/.anyhunt/video-transcript-local-worker"
LAUNCH_SCRIPT_PATH="${LAUNCH_DIR}/start.sh"
PLIST_PATH="${HOME}/Library/LaunchAgents/${SERVICE_LABEL}.plist"
LOG_OUT="${LOG_DIR}/video-transcript-local-worker.log"
LOG_ERR="${LOG_DIR}/video-transcript-local-worker.error.log"

ensure_dir() {
  local path="$1"
  mkdir -p "${path}"
}

require_command() {
  local cmd="$1"
  if ! command -v "${cmd}" >/dev/null 2>&1; then
    echo "[ERROR] 缺少命令: ${cmd}"
    exit 1
  fi
}

read_env_value() {
  local key="$1"
  local file="$2"
  if [[ ! -f "${file}" ]]; then
    return 1
  fi

  local raw
  raw="$(awk -F= -v k="${key}" '$1==k {print substr($0, index($0, "=")+1)}' "${file}" | tail -n 1)"
  if [[ -z "${raw}" ]]; then
    return 1
  fi

  raw="${raw%\"}"
  raw="${raw#\"}"
  raw="${raw%\'}"
  raw="${raw#\'}"
  printf '%s' "${raw}"
}

upsert_env() {
  local key="$1"
  local value="$2"
  local file="$3"
  local tmp
  tmp="$(mktemp)"

  awk -v k="${key}" -v v="${value}" '
    BEGIN { done=0 }
    $0 ~ "^[[:space:]]*" k "=" {
      print k "=" v
      done=1
      next
    }
    { print }
    END {
      if (done == 0) {
        print k "=" v
      }
    }
  ' "${file}" > "${tmp}"

  mv "${tmp}" "${file}"
}

install_dependencies_if_needed() {
  if [[ "${SKIP_DEP_INSTALL}" == "true" ]]; then
    return
  fi

  require_command brew

  local missing=()
  for formula in yt-dlp ffmpeg whisper-cpp; do
    if ! brew list --versions "${formula}" >/dev/null 2>&1; then
      missing+=("${formula}")
    fi
  done

  if [[ ${#missing[@]} -gt 0 ]]; then
    echo "[INFO] 安装依赖: ${missing[*]}"
    brew install "${missing[@]}"
  fi
}

prepare_env_file() {
  ensure_dir "$(dirname "${ENV_FILE}")"
  if [[ ! -f "${ENV_FILE}" ]]; then
    if [[ -f "${SERVER_DIR}/.env" ]]; then
      cp "${SERVER_DIR}/.env" "${ENV_FILE}"
      echo "[INFO] 已从 .env 复制初始化 ${ENV_FILE}"
    else
      touch "${ENV_FILE}"
      echo "[INFO] 已创建空环境文件 ${ENV_FILE}"
    fi
  fi
}

build_if_needed() {
  if [[ "${SKIP_BUILD}" == "true" ]]; then
    return
  fi

  require_command pnpm
  cd "${REPO_ROOT}"
  pnpm --filter @anyhunt/anyhunt-server build
}

validate_required_env_keys() {
  local required_keys=(
    DATABASE_URL
    REDIS_URL
    R2_ACCOUNT_ID
    R2_ACCESS_KEY_ID
    R2_SECRET_ACCESS_KEY
    R2_BUCKET_NAME
    R2_PUBLIC_URL
  )

  local missing=()
  for key in "${required_keys[@]}"; do
    local val=""
    if val="$(read_env_value "${key}" "${ENV_FILE}")"; then
      if [[ -z "${val}" ]]; then
        missing+=("${key}")
      fi
    else
      missing+=("${key}")
    fi
  done

  if [[ ${#missing[@]} -gt 0 ]]; then
    echo "[ERROR] ${ENV_FILE} 缺少必要变量: ${missing[*]}"
    exit 1
  fi
}

warn_if_missing_cloud_fallback_env_keys() {
  local optional_keys=(
    CF_ACCOUNT_ID
    CF_WORKERS_AI_API_TOKEN
  )

  local missing=()
  for key in "${optional_keys[@]}"; do
    local val=""
    if val="$(read_env_value "${key}" "${ENV_FILE}")"; then
      if [[ -z "${val}" ]]; then
        missing+=("${key}")
      fi
    else
      missing+=("${key}")
    fi
  done

  if [[ ${#missing[@]} -gt 0 ]]; then
    echo "[WARN] 未检测到 cloud fallback 相关变量: ${missing[*]}"
    echo "[WARN] local-worker 可正常运行；若需 cloud fallback，请在云端 worker 环境中补齐。"
  fi
}

main() {
  if [[ ! -d "${SERVER_DIR}" ]]; then
    echo "[ERROR] server 目录不存在: ${SERVER_DIR}"
    exit 1
  fi

  install_dependencies_if_needed

  require_command ffmpeg
  require_command ffprobe
  require_command yt-dlp

  local whisper_cmd
  whisper_cmd="$(command -v whisper-cli || true)"
  if [[ -z "${whisper_cmd}" ]]; then
    echo "[ERROR] 未找到 whisper-cli，请确认 whisper-cpp 安装正确并在 PATH 中。"
    exit 1
  fi

  prepare_env_file

  if [[ -z "${MODEL_PATH}" ]]; then
    MODEL_PATH="$(read_env_value VIDEO_TRANSCRIPT_LOCAL_WHISPER_MODEL_PATH "${ENV_FILE}" || true)"
  fi

  if [[ -z "${MODEL_PATH}" ]]; then
    echo "[ERROR] 请通过 --model-path 指定 Whisper 模型文件绝对路径。"
    exit 1
  fi
  if [[ ! -f "${MODEL_PATH}" ]]; then
    echo "[ERROR] Whisper 模型文件不存在: ${MODEL_PATH}"
    exit 1
  fi

  upsert_env VIDEO_TRANSCRIPT_ENABLE_LOCAL_WORKER "true" "${ENV_FILE}"
  upsert_env VIDEO_TRANSCRIPT_ENABLE_CLOUD_FALLBACK_WORKER "false" "${ENV_FILE}"
  upsert_env VIDEO_TRANSCRIPT_ENABLE_FALLBACK_SCANNER "false" "${ENV_FILE}"
  upsert_env VIDEO_TRANSCRIPT_LOCAL_ENABLED "true" "${ENV_FILE}"
  upsert_env VIDEO_TRANSCRIPT_LOCAL_NODE_ID "${NODE_ID}" "${ENV_FILE}"
  upsert_env VIDEO_TRANSCRIPT_LOCAL_WHISPER_CMD "${whisper_cmd}" "${ENV_FILE}"
  upsert_env VIDEO_TRANSCRIPT_LOCAL_WHISPER_MODEL_PATH "${MODEL_PATH}" "${ENV_FILE}"
  upsert_env VIDEO_TRANSCRIPT_YTDLP_CMD "$(command -v yt-dlp)" "${ENV_FILE}"
  upsert_env VIDEO_TRANSCRIPT_FFMPEG_CMD "$(command -v ffmpeg)" "${ENV_FILE}"
  upsert_env VIDEO_TRANSCRIPT_FFPROBE_CMD "$(command -v ffprobe)" "${ENV_FILE}"

  validate_required_env_keys
  warn_if_missing_cloud_fallback_env_keys
  build_if_needed

  ensure_dir "${LAUNCH_DIR}"
  ensure_dir "${HOME}/Library/LaunchAgents"
  ensure_dir "${LOG_DIR}"

  local pnpm_bin
  pnpm_bin="$(command -v pnpm)"

  cat > "${LAUNCH_SCRIPT_PATH}" <<EOF
#!/bin/zsh
set -euo pipefail
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:\$PATH"
cd "${SERVER_DIR}"
set -a
source "${ENV_FILE}"
set +a
exec "${pnpm_bin}" start:video-transcript-worker
EOF
  chmod +x "${LAUNCH_SCRIPT_PATH}"

  cat > "${PLIST_PATH}" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${SERVICE_LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/zsh</string>
    <string>${LAUNCH_SCRIPT_PATH}</string>
  </array>
  <key>WorkingDirectory</key>
  <string>${SERVER_DIR}</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>${LOG_OUT}</string>
  <key>StandardErrorPath</key>
  <string>${LOG_ERR}</string>
</dict>
</plist>
EOF

  echo "[INFO] 已生成:"
  echo "  - ${ENV_FILE}"
  echo "  - ${LAUNCH_SCRIPT_PATH}"
  echo "  - ${PLIST_PATH}"

  if [[ "${NO_START}" == "true" ]]; then
    echo "[INFO] 已跳过启动。手动执行："
    echo "  launchctl bootstrap gui/\$(id -u) ${PLIST_PATH}"
    echo "  launchctl kickstart -k gui/\$(id -u)/${SERVICE_LABEL}"
    exit 0
  fi

  local uid
  uid="$(id -u)"
  launchctl bootout "gui/${uid}/${SERVICE_LABEL}" >/dev/null 2>&1 || true
  launchctl bootstrap "gui/${uid}" "${PLIST_PATH}"
  launchctl kickstart -k "gui/${uid}/${SERVICE_LABEL}"

  echo "[INFO] local-worker 已启动: ${SERVICE_LABEL}"
  echo "[INFO] 日志文件:"
  echo "  - ${LOG_OUT}"
  echo "  - ${LOG_ERR}"
}

main "$@"
