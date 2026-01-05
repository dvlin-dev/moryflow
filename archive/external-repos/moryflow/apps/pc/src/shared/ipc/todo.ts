/** Plan 任务项 */
export type PlanTask = {
  /** 任务标题 */
  title: string
  status: 'pending' | 'in_progress' | 'completed'
}

/** Plan 快照（工具返回值和 UI 数据源） */
export type PlanSnapshot = {
  chatId: string
  tasks: PlanTask[]
  total: number
  pending: number
  inProgress: number
  completed: number
  /** 是否所有任务都已完成 */
  allCompleted: boolean
  /** 提示信息（引导 Agent 继续执行） */
  hint?: string
}
