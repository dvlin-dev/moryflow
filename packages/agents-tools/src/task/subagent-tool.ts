import { Agent, run, tool, type RunContext, type Tool } from '@openai/agents-core';
import { z } from 'zod';
import { normalizeToolSchemasForInterop, type AgentContext } from '@moryflow/agents-runtime';
import { toolSummarySchema } from '../shared';

const subagentParams = z.object({
  summary: toolSummarySchema.default('subagent'),
  prompt: z
    .string()
    .min(1)
    .describe('Detailed task description: what the subagent should do and what result is expected'),
});

/**
 * 子代理的系统提示
 */
const DEFAULT_SUB_AGENT_INSTRUCTIONS = `You are a focused executor. Complete the assigned task and return clear results.

1. Plan briefly, then execute. Prioritize doing over planning.
2. Use tools to verify — never guess facts or implementations.
3. Return a structured result: what was done, key findings, any issues, and recommended next steps.`;

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
    description: `Launch a subagent to execute complex multi-step tasks. The subagent has access to the full toolset available on this platform and autonomously orchestrates its execution path, returning a result summary.`,
    parameters: subagentParams,
    async execute({ summary, prompt }, runContext?: RunContext<AgentContext>) {
      console.log('[tool] subagent', { summary });

      const context = runContext?.context;
      const buildModel = context?.buildModel;

      if (!buildModel) {
        return {
          success: false,
          summary,
          error:
            'Subagent execution failed: unable to get model configuration, check agent settings',
        };
      }

      const resolvedTools = resolveSubagentTools(subAgentTools, context);
      if (resolvedTools.length === 0) {
        return {
          success: false,
          summary,
          error: 'Subagent execution failed: no tools configured for subagent',
        };
      }

      const normalizedTools = normalizeToolSchemasForInterop([...resolvedTools]);

      const { baseModel } = buildModel();
      const subAgent = new Agent({
        name: 'subagent-worker',
        instructions: `${instructions}\n\nCurrent task: ${prompt}`,
        model: baseModel,
        tools: normalizedTools,
      });

      try {
        const result = await run(subAgent, prompt, { context });

        return {
          success: true,
          summary,
          result: result.finalOutput ?? 'Task completed but produced no output',
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          success: false,
          summary,
          error: `Subagent execution failed: ${message}`,
        };
      }
    },
  });
};
