import { Controller, Get, UseGuards } from '@nestjs/common';
import { SessionGuard } from '@aiget/auth-server';
import { AdminGuard } from '../common/guards/admin.guard';
import { StatsService } from './stats.service';

@Controller('admin/stats')
@UseGuards(SessionGuard, AdminGuard)
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get()
  async getStats() {
    return this.statsService.getStats();
  }
}
