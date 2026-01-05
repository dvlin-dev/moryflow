import { tool, type RunContext } from '@moryflow/agents'
import { z } from 'zod'
import type { AgentContext } from '@moryflow/agents-runtime'
import { toolSummarySchema } from '../shared'

/** 任务状态 */
export type TaskStatus = 'pending' | 'in_progress' | 'completed'

/** 任务项 */
export interface PlanTask {
  title: string
  status: TaskStatus
}

/** Plan 快照 */
export interface PlanSnapshot {
  chatId: string
  tasks: PlanTask[]
  total: number
  pending: number
  inProgress: number
  completed: number
  allCompleted: boolean
}

/** Plan 任务项 schema（用于运行时验证） */
const planTaskSchema = z.object({
  title: z.string().min(1).describe('任务标题，面向用户的简洁描述'),
  status: z.enum(['pending', 'in_progress', 'completed']).describe('任务状态'),
})

const planTasksSchema = z.array(planTaskSchema)

/**
 * Plan 存储接口
 * PC 和 Mobile 需要各自实现
 */
export interface PlanStore {
  read(chatId: string): Promise<PlanTask[]>
  write(chatId: string, tasks: PlanTask[]): Promise<void>
}

/** 内存存储实现（默认） */
const createMemoryPlanStore = (): PlanStore => {
  const store = new Map<string, PlanTask[]>()
  return {
    async read(chatId: string) {
      return store.get(chatId) || []
    },
    async write(chatId: string, tasks: PlanTask[]) {
      if (tasks.length === 0) {
        store.delete(chatId)
      } else {
        store.set(chatId, tasks)
      }
    },
  }
}

// 默认内存存储
let defaultStore: PlanStore = createMemoryPlanStore()

/**
 * 设置全局 Plan 存储
 */
export const setPlanStore = (store: PlanStore) => {
  defaultStore = store
}

/**
 * 读取指定会话的 Plan
 */
export const readPlan = async (chatId: string): Promise<PlanTask[]> => {
  return defaultStore.read(chatId)
}

/** 构建 Plan 快照 */
const buildSnapshot = (chatId: string, tasks: PlanTask[]): PlanSnapshot => {
  const completed = tasks.filter((t) => t.status === 'completed').length
  const inProgress = tasks.filter((t) => t.status === 'in_progress').length
  const pending = tasks.filter((t) => t.status === 'pending').length
  return {
    chatId,
    tasks,
    total: tasks.length,
    pending,
    inProgress,
    completed,
    allCompleted: tasks.length > 0 && completed === tasks.length,
  }
}

/**
 * 创建计划管理工具
 */
export const createManagePlanTool = (store?: PlanStore) => {
  const planStore = store || defaultStore

  return tool({
    name: 'manage_plan',
    description: `创建和管理任务计划，帮助追踪进度、组织复杂任务。

## 何时使用
1. **复杂多步任务** - 需要 3 个以上步骤的任务
2. **用户提供多个任务** - 编号或逗号分隔的任务列表
3. **开始执行任务时** - 将状态标记为 in_progress
4. **完成任务后** - 将状态标记为 completed

## 何时不使用
1. 单一简单任务
2. 可以在 3 步以内完成的简单任务
3. 纯对话或信息类问题

## 核心特性
- ✅ 单次调用更新整个任务列表
- ✅ 可随时添加、删除、重排任务
- ✅ 自动持久化

## 使用示例

初始化任务列表：
\`\`\`json
{
  "tasks": [
    { "title": "分析代码实现", "status": "in_progress" },
    { "title": "实现新功能", "status": "pending" },
    { "title": "运行测试验证", "status": "pending" }
  ]
}
\`\`\`

更新任务状态：
\`\`\`json
{
  "tasks": [
    { "title": "分析代码实现", "status": "completed" },
    { "title": "实现新功能", "status": "in_progress" },
    { "title": "运行测试验证", "status": "pending" }
  ]
}
\`\`\`

## 任务状态
- **pending**: 待执行
- **in_progress**: 执行中（建议同时只有一个）
- **completed**: 已完成`,
    parameters: z.object({
      summary: toolSummarySchema.default('manage_plan'),
      tasks: planTasksSchema.describe('完整的任务列表（每次调用会完全替换现有列表）'),
    }),
    async execute({ tasks }, runContext?: RunContext<AgentContext>) {
      const chatId = runContext?.context?.chatId
      if (!chatId) {
        return { error: '无法获取会话 ID' }
      }

      await planStore.write(chatId, tasks)
      const snapshot = buildSnapshot(chatId, tasks)

      // 根据状态返回不同的提示，引导 Agent 继续执行
      if (!snapshot.allCompleted && snapshot.total > 0) {
        const currentTask = tasks.find((t) => t.status === 'in_progress')
        const nextPending = tasks.find((t) => t.status === 'pending')
        return {
          ...snapshot,
          hint: currentTask
            ? `当前任务「${currentTask.title}」进行中，请继续执行。`
            : nextPending
              ? `请开始执行下一个任务「${nextPending.title}」。`
              : '请继续处理剩余任务。',
        }
      }

      return snapshot
    },
  })
}
