import { Agent, run, tool, type RunContext, type Tool } from '@moryflow/agents'
import { z } from 'zod'
import type { AgentContext } from '@moryflow/agents-runtime'
import { toolSummarySchema } from '../shared'

const taskParams = z.object({
  summary: toolSummarySchema.default('task'),
  type: z.enum(['explore', 'research', 'batch']).describe('子代理类型'),
  prompt: z.string().min(1).describe('详细的任务描述，告诉子代理要做什么、期望什么结果'),
})

/**
 * 子代理的系统提示
 */
const SUB_AGENT_INSTRUCTIONS = {
  explore: `你是一个文件探索助手。你的任务是快速了解文件结构和内容。
使用 ls 和 glob 查看目录结构，使用 grep 搜索关键词，使用 read 阅读具体文件。
完成后，提供一份清晰的探索报告。`,

  research: `你是一个研究助手。你的任务是深入研究某个主题，搜集和整理相关信息。
可以搜索网络获取最新资料，也可以在本地文件中查找相关内容。
完成后，提供一份结构化的研究报告，包含关键发现和参考来源。`,

  batch: `你是一个批量处理助手。你的任务是对多个文件执行相似的操作。
先用 glob 找到所有目标文件，然后逐个处理。
处理过程中遇到问题要记录，完成后提供处理报告。`,
}

export type SubAgentType = 'explore' | 'research' | 'batch'

/**
 * 子代理工具集配置
 */
export interface SubAgentToolsConfig {
  explore: Tool<AgentContext>[]
  research: Tool<AgentContext>[]
  batch: Tool<AgentContext>[]
}


/**
 * 创建任务代理工具
 */
export const createTaskTool = (subAgentTools?: SubAgentToolsConfig) => {
  return tool({
    name: 'task',
    description:
      '启动子代理执行复杂的多步骤任务。适用于需要大量搜索/阅读的任务、批量文件处理等场景。子代理会独立完成任务并返回结果摘要。',
    parameters: taskParams,
    async execute(
      { summary, type, prompt },
      runContext?: RunContext<AgentContext>
    ) {
      console.log('[tool] task', { type, summary })

      const context = runContext?.context
      const buildModel = context?.buildModel

      if (!buildModel) {
        return {
          success: false,
          type,
          summary,
          error: '子代理执行失败: 无法获取模型配置，请检查 Agent 设置',
        }
      }

      if (!subAgentTools) {
        return {
          success: false,
          type,
          summary,
          error: '子代理执行失败: 未配置子代理工具集',
        }
      }

      const tools = subAgentTools[type]
      const instructions = SUB_AGENT_INSTRUCTIONS[type]

      const { baseModel } = buildModel()
      const subAgent = new Agent({
        name: `${type}-agent`,
        instructions: `${instructions}\n\n当前任务：${prompt}`,
        model: baseModel,
        tools: [...tools],
      })

      try {
        const result = await run(subAgent, prompt, { context })

        return {
          success: true,
          type,
          summary,
          result: result.finalOutput ?? '任务完成，但没有输出结果',
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        return {
          success: false,
          type,
          summary,
          error: `子代理执行失败: ${message}`,
        }
      }
    },
  })
}
