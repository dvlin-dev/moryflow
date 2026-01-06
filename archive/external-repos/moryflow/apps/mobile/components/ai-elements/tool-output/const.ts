/**
 * Tool Output 类型定义和工具函数
 */

import { isValidElement, type ReactNode } from 'react'

// ============ 类型定义 ============

/** 命令执行结果 */
export interface CommandResult {
  command?: string
  args?: string[]
  cwd?: string
  stdout?: string
  stderr?: string
  exitCode?: number | null
  durationMs?: number
}

/** Diff 结果 */
export interface DiffResult {
  patch?: string
  preview?: string
  truncated?: boolean
  rationale?: string
  path?: string
  baseSha?: string
  mode?: 'patch' | 'replace'
  content?: string
}

/** Todo 结果 */
export interface TodoResult {
  chatId?: string
  tasks?: Array<{
    title: string
    status: 'pending' | 'in_progress' | 'completed'
  }>
  total?: number
  pending?: number
  inProgress?: number
  completed?: number
  allCompleted?: boolean
  hint?: string
}

/** ToolOutput Props */
export interface ToolOutputProps {
  output?: unknown
  errorText?: string
}

// ============ 类型守卫 ============

export function isCommandResult(value: unknown): value is CommandResult {
  if (!value || typeof value !== 'object' || isValidElement(value as ReactNode)) {
    return false
  }
  const record = value as Record<string, unknown>
  return (
    typeof record.stdout === 'string' ||
    typeof record.stderr === 'string' ||
    typeof record.command === 'string'
  )
}

export function isDiffResult(value: unknown): value is DiffResult {
  if (!value || typeof value !== 'object' || isValidElement(value as ReactNode)) {
    return false
  }
  const record = value as Record<string, unknown>
  return typeof record.patch === 'string' || typeof record.preview === 'string'
}

export function isTodoResult(value: unknown): value is TodoResult {
  if (!value || typeof value !== 'object' || isValidElement(value as ReactNode)) {
    return false
  }
  return Array.isArray((value as Record<string, unknown>).tasks)
}
