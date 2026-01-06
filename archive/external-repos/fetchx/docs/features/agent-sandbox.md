# AI Agent 沙箱服务（规划中）

> 独立的 AI Agent 任务执行环境服务。

---

## 需求背景

提供一个 API，允许用户通过自然语言输入来运行 AI Agent 任务，类似于 Manus/OpenHands。

### 目标使用场景

1. **数据分析**："分析这个 CSV 文件并生成图表"
2. **网页提取**："从这个页面提取产品信息"
3. **代码生成**："创建一个待办事项网页"

---

## 技术设计（提案）

```
POST /api/v1/agent/run
  ↓
AgentController.run()
  ↓
AgentService.run()
  ├── 创建沙箱环境（如 Cloudflare Sandbox 或 E2B）
  ├── 初始化 Agent 并配置工具（浏览器、代码、文件）
  └── 执行任务 → 返回结构化输出
```

---

## 核心概念

```typescript
// 提案 API
const agent = getAgentSandbox(config, userId);

const result = await agent.run('分析销售数据并找出热门产品', {
  files: [{ path: '/data.csv', content: csvContent }],
  tools: ['python', 'browser'],
  timeout: 60000,
});

// 返回结果
{
  status: 'completed',
  artifacts: [
    { type: 'report', content: '...' },
    { type: 'chart', url: 'https://...' }
  ],
  logs: [...]
}
```

---

## 功能对比

| 维度 | Cloudflare 沙箱 | Agent 沙箱 |
|------|----------------|-----------|
| 输入 | 代码 | 自然语言 |
| 决策 | 用户决定 | AI 决定 |
| 输出 | 执行结果 | 结构化产物 |

---

## 可用工具（提案）

| 工具 | 能力 |
|------|------|
| Browser | 网页抓取、截图 |
| Python | 数据分析、可视化 |
| File | 沙箱内文件读写 |
| Shell | 执行命令 |

---

## 状态

**尚未实现**。这是未来的功能方向。

---

*版本: 1.0 | 更新时间: 2026-01*
