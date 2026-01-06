import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtGuard } from '@aiget/auth-server';
import { AdminGuard } from '../common/guards/admin.guard';
import { StatsService } from './stats.service';

@Controller('admin/stats')
@UseGuards(JwtGuard, AdminGuard)
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get()
  async getStats() {
    return this.statsService.getStats();
  }
}
