export type AgentApplyEditInput = {
  path: string
  baseSha: string
  mode?: 'patch' | 'replace'
  patch?: string
  content?: string
}

export type AgentApplyEditResult = {
  path: string
  sha256: string
  size: number
  preview: string
  truncated: boolean
}
