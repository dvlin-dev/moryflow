/**
 * Admin Dashboard Controller
 * 管理后台仪表盘 API
 */

import { Controller, Get } from '@nestjs/common';
import {
  ApiTags,
  ApiSecurity,
  ApiOperation,
  ApiOkResponse,
} from '@nestjs/swagger';
import { RequireAdmin } from '../auth';
import { AdminService } from './admin.service';

@ApiTags('Admin - Dashboard')
@ApiSecurity('session')
@Controller({ path: 'admin/dashboard', version: '1' })
@RequireAdmin()
export class AdminDashboardController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  @ApiOperation({ summary: 'Get dashboard statistics' })
  @ApiOkResponse({ description: 'Dashboard statistics' })
  async getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('charts')
  @ApiOperation({ summary: 'Get chart data (last 7 days)' })
  @ApiOkResponse({ description: 'Chart data' })
  async getChartData() {
    return this.adminService.getChartData();
  }
}
