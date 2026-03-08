#!/bin/bash
# ============================================
# MoryFlow PC 发布脚本
# 用法: ./apps/moryflow/pc/scripts/release.sh <version>
# 示例: ./apps/moryflow/pc/scripts/release.sh 0.2.0
# ============================================

set -e

VERSION=$1
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PC_DIR="$(dirname "$SCRIPT_DIR")"
ROOT_DIR="$(cd "$PC_DIR/../.." && pwd)"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
success() { echo -e "${GREEN}✅ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }
error() { echo -e "${RED}❌ $1${NC}"; exit 1; }

# 检查版本参数
if [ -z "$VERSION" ]; then
  echo ""
  echo "MoryFlow PC 发布脚本"
  echo ""
  echo "用法: ./apps/moryflow/pc/scripts/release.sh <version>"
  echo ""
  echo "示例:"
  echo "  ./apps/moryflow/pc/scripts/release.sh 0.2.0      # 正式版本"
  echo "  ./apps/moryflow/pc/scripts/release.sh 0.2.0-beta # 预发布版本"
  echo ""
  exit 1
fi

# 验证版本格式
if ! [[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.]+)?$ ]]; then
  error "无效的版本格式: $VERSION (应为 x.y.z 或 x.y.z-suffix)"
fi

cd "$ROOT_DIR"

info "准备发布 MoryFlow v$VERSION"
echo ""

# 1. 检查 Git 状态
info "检查 Git 状态..."
if [ -n "$(git status --porcelain)" ]; then
  warn "存在未提交的更改:"
  git status --short
  echo ""
  read -p "是否继续？(y/N) " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# 2. 检查是否已存在该 tag
if git rev-parse "v$VERSION" >/dev/null 2>&1; then
  error "Tag v$VERSION 已存在！请使用其他版本号"
fi

# 3. 更新 package.json 版本
info "更新 apps/moryflow/pc/package.json 版本..."
cd "$PC_DIR"
# 使用 node 更新版本，避免 pnpm version 的副作用
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.version = '$VERSION';
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
console.log('版本已更新: ' + pkg.version);
"
cd "$ROOT_DIR"

# 4. 提交版本更新
info "提交版本更新..."
git add apps/moryflow/pc/package.json
git commit -m "chore(release): bump version to $VERSION"

# 5. 创建 tag
info "创建 Git tag v$VERSION..."
git tag -a "v$VERSION" -m "Release v$VERSION

🎉 MoryFlow $VERSION

## 下载链接

**国内加速 (Cloudflare)**
- https://download.moryflow.com/$VERSION/

**GitHub Releases**
- https://github.com/dvlin-dev/moryflow/releases/tag/v$VERSION
"

# 6. 推送
info "推送到远程仓库..."
CURRENT_BRANCH=$(git branch --show-current)
git push origin "$CURRENT_BRANCH"
git push origin "v$VERSION"

echo ""
success "发布流程已触发！"
echo ""
echo "📦 版本: v$VERSION"
echo "🔗 GitHub Actions: https://github.com/dvlin-dev/moryflow/actions"
echo ""
echo "构建完成后，请在以下位置检查产物:"
echo "  - GitHub Releases: https://github.com/dvlin-dev/moryflow/releases"
echo "  - App updates feed: https://download.moryflow.com/channels/"
echo ""
