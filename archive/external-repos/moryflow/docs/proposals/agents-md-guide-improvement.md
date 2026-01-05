# CLAUDE.md 分形文档规范改进方案

> 针对 `docs/agents-md-guide.md` 的审核清单与改进建议

## 执行状态：✅ 已完成

执行时间：2026-01-04

## 审核摘要

| 类别 | 问题数 | 优先级 | 状态 |
|------|--------|--------|------|
| 文件命名统一 | 1 | **最高** | ✅ 已完成 |
| 内容过时/不一致 | 2 | 高 | ✅ 已完成 |
| 缺失内容 | 4 | 中 | 部分完成 |
| 结构优化 | 2 | 低 | 待处理 |

---

## 零、文件命名统一（最高优先级）✅ 已完成

### 0.1 统一使用 CLAUDE.md 作为主文件 ✅

**决策**：以 `CLAUDE.md` 为准，`AGENTS.md` 作为软链接兼容其他 AI 工具。

**当前状态**：
```
根目录：  CLAUDE.md -> AGENTS.md  (软链接)
子目录：  AGENTS.md               (实际文件)
```

**目标状态**：
```
所有目录：CLAUDE.md              (实际文件)
所有目录：AGENTS.md -> CLAUDE.md (软链接，兼容其他 AI)
```

**需要修改的文件**（共 22 个）：

| 目录 | 操作 |
|------|------|
| `/` (根目录) | 删除软链接，重命名 AGENTS.md → CLAUDE.md，创建反向软链接 |
| `apps/admin/` | 重命名 + 创建软链接 |
| `apps/mobile/` | 重命名 + 创建软链接 |
| `apps/mobile/app/` | 重命名 + 创建软链接 |
| `apps/mobile/components/` | 重命名 + 创建软链接 |
| `apps/mobile/lib/` | 重命名 + 创建软链接 |
| `apps/pc/` | 重命名 + 创建软链接 |
| `apps/pc/src/main/` | 重命名 + 创建软链接 |
| `apps/pc/src/main/site-publish/` | 重命名 + 创建软链接 |
| `apps/pc/src/renderer/` | 重命名 + 创建软链接 |
| `apps/pc/src/renderer/components/share/` | 重命名 + 创建软链接 |
| `apps/pc/src/renderer/workspace/components/sites/` | 重命名 + 创建软链接 |
| `apps/server/` | 重命名 + 创建软链接 |
| `apps/server/src/openapi/` | 重命名 + 创建软链接 |
| `apps/server/src/pre-register/` | 重命名 + 创建软链接 |
| `apps/site-template/` | 重命名 + 创建软链接 |
| `docs/` | 重命名 + 创建软链接 |
| `packages/` | 重命名 + 创建软链接 |
| `packages/agents-core/` | 重命名 + 创建软链接 |
| `packages/agents-openai/` | 重命名 + 创建软链接 |
| `packages/model-registry-data/` | 重命名 + 创建软链接 |
| `packages/shared-api/` | 重命名 + 创建软链接 |

**执行脚本**：

```bash
#!/bin/bash
# 统一 CLAUDE.md 为主文件，AGENTS.md 为软链接

# 1. 根目录特殊处理（当前是反向的）
rm CLAUDE.md  # 删除旧软链接
mv AGENTS.md CLAUDE.md
ln -s CLAUDE.md AGENTS.md

# 2. 子目录批量处理
dirs=(
  "apps/admin"
  "apps/mobile"
  "apps/mobile/app"
  "apps/mobile/components"
  "apps/mobile/lib"
  "apps/pc"
  "apps/pc/src/main"
  "apps/pc/src/main/site-publish"
  "apps/pc/src/renderer"
  "apps/pc/src/renderer/components/share"
  "apps/pc/src/renderer/workspace/components/sites"
  "apps/server"
  "apps/server/src/openapi"
  "apps/server/src/pre-register"
  "apps/site-template"
  "docs"
  "packages"
  "packages/agents-core"
  "packages/agents-openai"
  "packages/model-registry-data"
  "packages/shared-api"
)

for dir in "${dirs[@]}"; do
  if [ -f "$dir/AGENTS.md" ]; then
    mv "$dir/AGENTS.md" "$dir/CLAUDE.md"
    ln -s CLAUDE.md "$dir/AGENTS.md"
    echo "✓ $dir"
  fi
done
```

**后续规范更新**：
- `docs/agents-md-guide.md` 中所有 `AGENTS.md` 引用改为 `CLAUDE.md`
- 文档模板中的触发器注释也需同步更新

---

## 一、内容过时/不一致（高优先级）

### 1.1 根目录模板与实际 CLAUDE.md 不一致

**问题**：`agents-md-guide.md` 中的根目录模板缺少实际 `CLAUDE.md` 中使用的多个章节。

**缺失章节**：
- `🔄 核心同步协议` 中的第 5 条「零兼容原则」
- `📂 目录规范` 中的「前端组件结构」和「公共函数区分」
- `⚡ 代码原则` 中的「核心原则」（5 条 SOLID 变体）、「代码实践」、「注释规范」、「禁止事项」
- `🎨 视觉风格` 章节
- `🌐 语言规范` 章节（含 Agent Tool 规范）

**建议**：同步更新根目录模板，或明确说明模板是精简版，完整版参考项目 CLAUDE.md。

### 1.2 创建阈值规则过于机械

**问题**：「目录下超过 10 个文件时创建 CLAUDE.md」规则过于机械。

**实际情况**：
- 部分关键目录（如 `src/main/site-publish/`）文件不多但逻辑复杂，仍需 CLAUDE.md
- 部分大目录（如 `node_modules/`）显然不需要

**建议**：改为「满足以下任一条件时创建」：
1. 目录下超过 10 个文件
2. 包含复杂业务逻辑
3. 作为独立功能模块
4. 有跨目录依赖关系需要说明

---

## 二、缺失内容（中优先级）

### 2.1 缺少 CLAUDE.md 与 AGENTS.md 软链接机制说明

**问题**：未说明 `CLAUDE.md` 与 `AGENTS.md` 的软链接关系。

**建议新增章节**：

```markdown
## CLAUDE.md 与 AGENTS.md 的关系

不同的 AI 工具识别不同的配置文件名：
- Claude 工具链读取 `CLAUDE.md`
- 其他 AI 工具（如 Cursor）读取 `AGENTS.md`

**规范**：以 `CLAUDE.md` 为主文件，`AGENTS.md` 为软链接

```bash
# 创建软链接（在每个需要的目录下执行）
ln -s CLAUDE.md AGENTS.md
```

这样修改 CLAUDE.md 时，AGENTS.md 自动同步。
```

### 2.2 缺少实际案例展示

**问题**：规范中只有模板，缺少真实项目中的案例对比。

**建议新增**：引用项目中优秀的 CLAUDE.md 作为范例：
- `apps/pc/CLAUDE.md`（包含架构图）
- `packages/CLAUDE.md`（包含依赖关系图）

### 2.3 缺少常见错误示例

**问题**：只说「应该怎么做」，没说「不应该怎么做」。

**建议新增章节**：

```markdown
## 常见错误

### ❌ 错误示例 1：过度描述
不要把整个文件代码解释一遍，只需说明接口和定位。

### ❌ 错误示例 2：不更新触发器
代码改了但 CLAUDE.md 没更新，导致 AI 获取过时信息。

### ❌ 错误示例 3：孤立的 CLAUDE.md
没有在父目录 CLAUDE.md 中建立索引链接。
```

### 2.4 缺少与 docs/features 的整合说明

**问题**：「功能文档规范」章节标注为「可选」，但与 `docs/CLAUDE.md` 中的功能列表如何协同未说明。

**建议**：明确 `docs/CLAUDE.md` 作为功能索引，与各功能目录下的 `prd.md`、`tech.md` 的关系。

---

## 三、结构优化（低优先级）

### 3.1 章节顺序优化

**问题**：「快速开始」放在文档末尾，但通常应作为入门第一步。

**建议**：
1. 开头：为什么需要 + 快速开始（30 秒理解核心）
2. 中间：详细规范（三层结构、模板）
3. 结尾：参考资料

### 3.2 新增「维护指南」章节

**建议新增**：

```markdown
## 维护指南

### 何时更新 CLAUDE.md
- 新增/删除文件或目录
- 修改模块职责或依赖关系
- 发现 AI 理解错误时

### 如何验证文档质量
进入任意子目录，让 AI 回答：
1. 这个目录是做什么的？
2. 修改某功能应该改哪些文件？
3. 有什么技术约束需要遵守？
如果回答不准确，说明文档需要改进。
```

---

## 四、执行建议

### 优先级排序

1. **最高优先级**（立即执行）
   - 0.1 统一使用 CLAUDE.md 作为主文件（22 个目录）

2. **高优先级**（完成最高后执行）
   - 1.1 同步根目录模板与实际 CLAUDE.md
   - 2.1 补充软链接机制说明

3. **中优先级**（下次迭代处理）
   - 1.2 优化创建阈值规则
   - 2.2-2.4 补充缺失内容

4. **低优先级**（有空再优化）
   - 3.1-3.2 结构优化

---

## 五、是否需要改进？

请确认：
- [ ] 同意最高优先级改进（统一 CLAUDE.md）
- [ ] 同意高优先级改进
- [ ] 同意中优先级改进
- [ ] 同意低优先级改进
- [ ] 有其他建议或修改意见

确认后我将执行相应的更新。
