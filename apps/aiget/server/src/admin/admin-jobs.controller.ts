/**
 * Admin Jobs Controller
 * 任务管理 API
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
import { AdminJobsService } from './admin-jobs.service';
import {
  jobsQuerySchema,
  errorStatsQuerySchema,
  cleanupStaleJobsSchema,
  type JobsQuery,
  type ErrorStatsQuery,
  type CleanupStaleJobsQuery,
} from './dto';

@ApiTags('Admin - Jobs')
@ApiSecurity('session')
@Controller({ path: 'admin/jobs', version: '1' })
@RequireAdmin()
export class AdminJobsController {
  constructor(private readonly adminJobsService: AdminJobsService) {}

  @Get()
  @ApiOperation({ summary: 'Get job list' })
  @ApiOkResponse({ description: 'Job list with pagination' })
  async getJobs(
    @Query(new ZodValidationPipe(jobsQuerySchema)) query: JobsQuery,
  ) {
    return this.adminJobsService.getJobs(query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get job statistics' })
  @ApiOkResponse({ description: 'Job statistics' })
  async getJobStats() {
    return this.adminJobsService.getJobStats();
  }

  @Get('errors')
  @ApiOperation({ summary: 'Get error statistics' })
  @ApiOkResponse({ description: 'Error statistics' })
  async getErrorStats(
    @Query(new ZodValidationPipe(errorStatsQuerySchema)) query: ErrorStatsQuery,
  ) {
    return this.adminJobsService.getErrorStats(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get job by ID' })
  @ApiParam({ name: 'id', description: 'Job ID' })
  @ApiOkResponse({ description: 'Job details' })
  async getJob(@Param('id') id: string) {
    return this.adminJobsService.getJob(id);
  }

  @Post('cleanup-stale')
  @ApiOperation({ summary: 'Cleanup stale jobs' })
  @ApiOkResponse({ description: 'Cleanup result' })
  async cleanupStaleJobs(
    @Query(new ZodValidationPipe(cleanupStaleJobsSchema))
    query: CleanupStaleJobsQuery,
  ) {
    return this.adminJobsService.cleanupStaleJobs(query);
  }
}
