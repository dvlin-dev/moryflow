import { Agent, run, tool, type RunContext, type Tool } from '@openai/agents-core';
import { z } from 'zod';
import { normalizeToolSchemasForInterop, type AgentContext } from '@moryflow/agents-runtime';
import { toolSummarySchema } from '../shared';

const subagentParams = z.object({
  summary: toolSummarySchema.default('subagent'),
  prompt: z.string().min(1).describe('详细的任务描述，告诉子代理要做什么、期望什么结果'),
});

/**
 * 子代理的系统提示
 */
const DEFAULT_SUB_AGENT_INSTRUCTIONS = `你是一个子代理执行器。请根据任务目标自主拆解步骤并选择最合适的工具完成任务。
优先先制定简短计划，再执行并校验关键结果。
完成后输出结构化结果，包含：结论、关键证据、风险与后续建议。`;

export type SubAgentInstructionsConfig = string;

/**
 * 子代理工具集配置
 */
export type SubAgentToolsConfig =
  | Tool<AgentContext>[]
  | ((context?: AgentContext) => Tool<AgentContext>[]);

const resolveSubagentTools = (
  config: SubAgentToolsConfig | undefined,
  context?: AgentContext
): Tool<AgentContext>[] => {
  if (!config) {
    return [];
  }
  if (typeof config === 'function') {
    return config(context);
  }
  return config;
};

/**
 * 创建子代理工具
 */
export const createSubagentTool = (
  subAgentTools?: SubAgentToolsConfig,
  instructionOverride?: SubAgentInstructionsConfig
) => {
  const instructions = instructionOverride ?? DEFAULT_SUB_AGENT_INSTRUCTIONS;

  return tool({
    name: 'subagent',
    description:
      '启动子代理执行复杂多步骤任务。子代理拥有同端可用的完整工具能力，并自主编排执行路径后返回结果摘要。',
    parameters: subagentParams,
    async execute({ summary, prompt }, runContext?: RunContext<AgentContext>) {
      console.log('[tool] subagent', { summary });

      const context = runContext?.context;
      const buildModel = context?.buildModel;

      if (!buildModel) {
        return {
          success: false,
          summary,
          error: '子代理执行失败: 无法获取模型配置，请检查 Agent 设置',
        };
      }

      const resolvedTools = resolveSubagentTools(subAgentTools, context);
      if (resolvedTools.length === 0) {
        return {
          success: false,
          summary,
          error: '子代理执行失败: 未配置子代理工具集',
        };
      }

      const normalizedTools = normalizeToolSchemasForInterop([...resolvedTools]);

      const { baseModel } = buildModel();
      const subAgent = new Agent({
        name: 'subagent-worker',
        instructions: `${instructions}\n\n当前任务：${prompt}`,
        model: baseModel,
        tools: normalizedTools,
      });

      try {
        const result = await run(subAgent, prompt, { context });

        return {
          success: true,
          summary,
          result: result.finalOutput ?? '任务完成，但没有输出结果',
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          success: false,
          summary,
          error: `子代理执行失败: ${message}`,
        };
      }
    },
  });
};
