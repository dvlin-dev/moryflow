/**
 * Agent Task Repository
 *
 * [INPUT]: Agent 任务数据（创建/更新/查询）
 * [OUTPUT]: 持久化任务记录与扣费流水
 * [POS]: Agent 任务持久化封装（DB 读写），供 AgentService 调用
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma-main/client';
import type {
  AgentTask,
  AgentTaskCharge,
  AgentTaskStatus,
} from '../../generated/prisma-main/client';
import { PrismaService } from '../prisma/prisma.service';

interface CreateAgentTaskParams {
  id: string;
  userId: string;
  input: unknown;
  status?: AgentTaskStatus;
}

interface UpdateAgentTaskParams {
  status?: AgentTaskStatus;
  result?: unknown;
  error?: string;
  creditsUsed?: number;
  toolCallCount?: number;
  elapsedMs?: number;
  startedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
}

interface CreateAgentTaskChargeParams {
  taskId: string;
  userId: string;
  amount: number;
  source: AgentTaskCharge['source'];
  transactionId: string;
  referenceId: string;
}

@Injectable()
export class AgentTaskRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createTask(params: CreateAgentTaskParams): Promise<AgentTask> {
    return this.prisma.agentTask.create({
      data: {
        id: params.id,
        userId: params.userId,
        status: params.status ?? 'PENDING',
        input: this.toJson(params.input),
      },
    });
  }

  async getTaskForUser(
    taskId: string,
    userId: string,
  ): Promise<AgentTask | null> {
    return this.prisma.agentTask.findFirst({
      where: { id: taskId, userId },
    });
  }

  async updateTask(
    taskId: string,
    params: UpdateAgentTaskParams,
  ): Promise<AgentTask> {
    const data = this.toUpdateData(params);
    return this.prisma.agentTask.update({
      where: { id: taskId },
      data,
    });
  }

  async updateTaskIfStatus(
    taskId: string,
    statuses: AgentTaskStatus[],
    params: UpdateAgentTaskParams,
  ): Promise<boolean> {
    const data = this.toUpdateData(params);
    const result = await this.prisma.agentTask.updateMany({
      where: { id: taskId, status: { in: statuses } },
      data,
    });
    return result.count > 0;
  }

  async updateTaskMetrics(
    taskId: string,
    params: Pick<
      UpdateAgentTaskParams,
      'creditsUsed' | 'toolCallCount' | 'elapsedMs'
    >,
  ): Promise<void> {
    await this.prisma.agentTask.updateMany({
      where: { id: taskId },
      data: {
        creditsUsed: params.creditsUsed,
        toolCallCount: params.toolCallCount,
        elapsedMs: params.elapsedMs,
      },
    });
  }

  async createCharge(
    params: CreateAgentTaskChargeParams,
  ): Promise<AgentTaskCharge> {
    return this.prisma.agentTaskCharge.create({
      data: {
        taskId: params.taskId,
        userId: params.userId,
        amount: params.amount,
        source: params.source,
        transactionId: params.transactionId,
        referenceId: params.referenceId,
      },
    });
  }

  async listCharges(taskId: string): Promise<AgentTaskCharge[]> {
    return this.prisma.agentTaskCharge.findMany({
      where: { taskId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async markChargeRefunded(chargeId: string): Promise<AgentTaskCharge> {
    return this.prisma.agentTaskCharge.update({
      where: { id: chargeId },
      data: { refundedAt: new Date() },
    });
  }

  private toUpdateData(
    params: UpdateAgentTaskParams,
  ): Prisma.AgentTaskUpdateInput {
    return {
      status: params.status,
      result:
        params.result === undefined ? undefined : this.toJson(params.result),
      error: params.error,
      creditsUsed: params.creditsUsed,
      toolCallCount: params.toolCallCount,
      elapsedMs: params.elapsedMs,
      startedAt: params.startedAt,
      completedAt: params.completedAt,
      cancelledAt: params.cancelledAt,
    };
  }

  private toJson(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
  }
}
