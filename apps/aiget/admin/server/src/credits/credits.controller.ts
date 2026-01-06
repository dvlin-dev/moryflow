import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtGuard } from '@aiget/auth-server';
import { AdminGuard } from '../common/guards/admin.guard';
import { CreditsService } from './credits.service';
import { ListCreditsQuerySchema } from './dto';

@Controller('admin/credits')
@UseGuards(JwtGuard, AdminGuard)
export class CreditsController {
  constructor(private readonly creditsService: CreditsService) {}

  @Get()
  async listCredits(@Query() query: Record<string, unknown>) {
    const parsed = ListCreditsQuerySchema.parse(query);
    return this.creditsService.listCredits(parsed);
  }
}
