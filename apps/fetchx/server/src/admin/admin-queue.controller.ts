/**
 * Admin Queue Controller
 * 队列监控 API
 */

import { Controller, Get, Post, Query, Param } from '@nestjs/common';
import {
  ApiTags,
  ApiSecurity,
  ApiOperation,
  ApiOkResponse,
  ApiParam,
} from '@nestjs/swagger';
import { RequireAdmin } from '../auth';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { AdminQueueService } from './admin-queue.service';
import {
  queueJobsQuerySchema,
  cleanQueueSchema,
  type QueueJobsQuery,
  type CleanQueueDto,
} from './dto';

@ApiTags('Admin - Queues')
@ApiSecurity('session')
@Controller({ path: 'admin/queues', version: '1' })
@RequireAdmin()
export class AdminQueueController {
  constructor(private readonly adminQueueService: AdminQueueService) {}

  @Get()
  @ApiOperation({ summary: 'Get all queue stats' })
  @ApiOkResponse({ description: 'All queue statistics' })
  async getAllQueueStats() {
    return this.adminQueueService.getAllQueueStats();
  }

  @Get(':name')
  @ApiOperation({ summary: 'Get queue stats by name' })
  @ApiParam({ name: 'name', description: 'Queue name' })
  @ApiOkResponse({ description: 'Queue statistics' })
  async getQueueStats(@Param('name') name: string) {
    return this.adminQueueService.getQueueStats(name);
  }

  @Get(':name/jobs')
  @ApiOperation({ summary: 'Get queue jobs' })
  @ApiParam({ name: 'name', description: 'Queue name' })
  @ApiOkResponse({ description: 'Queue jobs list' })
  async getQueueJobs(
    @Param('name') name: string,
    @Query(new ZodValidationPipe(queueJobsQuerySchema)) query: QueueJobsQuery,
  ) {
    return this.adminQueueService.getQueueJobs(name, query);
  }

  @Get(':name/jobs/:jobId')
  @ApiOperation({ summary: 'Get queue job by ID' })
  @ApiParam({ name: 'name', description: 'Queue name' })
  @ApiParam({ name: 'jobId', description: 'Job ID' })
  @ApiOkResponse({ description: 'Queue job details' })
  async getQueueJob(
    @Param('name') name: string,
    @Param('jobId') jobId: string,
  ) {
    return this.adminQueueService.getQueueJob(name, jobId);
  }

  @Post(':name/jobs/:jobId/retry')
  @ApiOperation({ summary: 'Retry a failed job' })
  @ApiParam({ name: 'name', description: 'Queue name' })
  @ApiParam({ name: 'jobId', description: 'Job ID' })
  @ApiOkResponse({ description: 'Job retried' })
  async retryJob(@Param('name') name: string, @Param('jobId') jobId: string) {
    return this.adminQueueService.retryJob(name, jobId);
  }

  @Post(':name/retry-all')
  @ApiOperation({ summary: 'Retry all failed jobs' })
  @ApiParam({ name: 'name', description: 'Queue name' })
  @ApiOkResponse({ description: 'Retry result' })
  async retryAllFailed(@Param('name') name: string) {
    return this.adminQueueService.retryAllFailed(name);
  }

  @Post(':name/clean')
  @ApiOperation({ summary: 'Clean queue' })
  @ApiParam({ name: 'name', description: 'Queue name' })
  @ApiOkResponse({ description: 'Clean result' })
  async cleanQueue(
    @Param('name') name: string,
    @Query(new ZodValidationPipe(cleanQueueSchema)) dto: CleanQueueDto,
  ) {
    return this.adminQueueService.cleanQueue(name, dto.status);
  }

  @Post(':name/pause')
  @ApiOperation({ summary: 'Pause queue' })
  @ApiParam({ name: 'name', description: 'Queue name' })
  @ApiOkResponse({ description: 'Queue paused' })
  async pauseQueue(@Param('name') name: string) {
    return this.adminQueueService.pauseQueue(name);
  }

  @Post(':name/resume')
  @ApiOperation({ summary: 'Resume queue' })
  @ApiParam({ name: 'name', description: 'Queue name' })
  @ApiOkResponse({ description: 'Queue resumed' })
  async resumeQueue(@Param('name') name: string) {
    return this.adminQueueService.resumeQueue(name);
  }
}
