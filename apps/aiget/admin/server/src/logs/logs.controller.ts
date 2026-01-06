import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtGuard } from '@aiget/auth-server';
import { AdminGuard } from '../common/guards/admin.guard';
import { LogsService } from './logs.service';
import { ListLogsQuerySchema } from './dto';

@Controller('admin/logs')
@UseGuards(JwtGuard, AdminGuard)
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  @Get()
  async listLogs(@Query() query: Record<string, unknown>) {
    const parsed = ListLogsQuerySchema.parse(query);
    return this.logsService.listLogs(parsed);
  }
}
