import type { AgentRuntime } from '../agent-runtime/index.js'
import { createAgentRuntime } from '../agent-runtime/index.js'

let runtime: AgentRuntime | null = null

export const getRuntime = () => {
  if (!runtime) {
    runtime = createAgentRuntime()
  }
  return runtime
}
