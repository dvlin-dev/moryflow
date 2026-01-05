import { Agent, type Tool } from '@moryflow/agents'

import type { ModelFactory } from './model-factory'
import { getMorySystemPrompt } from './prompt'
import type { AgentContext } from './types'

export interface AgentFactoryOptions {
  getModelFactory(): ModelFactory
  baseTools: Tool<AgentContext>[]
  getMcpTools(): Tool<AgentContext>[]
}

export interface AgentFactory {
  getAgent(preferredModelId?: string): { agent: Agent<AgentContext>; modelId: string }
  invalidate(): void
}

/**
 * 创建 Agent 工厂
 * 负责管理 Agent 实例与缓存，确保不同模型复用同一构建逻辑
 */
export const createAgentFactory = ({
  getModelFactory,
  baseTools,
  getMcpTools,
}: AgentFactoryOptions): AgentFactory => {
  const agentCache = new Map<string, Agent<AgentContext>>()

  const buildAgent = (modelId: string) => {
    const { baseModel } = getModelFactory().buildModel(modelId)
    return new Agent({
      name: 'Mory',
      instructions: getMorySystemPrompt(),
      model: baseModel,
      tools: [...baseTools, ...getMcpTools()],
    })
  }

  const getAgent = (preferredModelId?: string) => {
    const { modelId } = getModelFactory().buildModel(preferredModelId)
    let agent = agentCache.get(modelId)
    if (!agent) {
      agent = buildAgent(modelId)
      agentCache.set(modelId, agent)
    }
    return { agent, modelId }
  }

  const invalidate = () => {
    agentCache.clear()
  }

  return { getAgent, invalidate }
}
