/**
 * Admin Dashboard Controller
 *
 * [INPUT]: Dashboard data requests
 * [OUTPUT]: Statistics and chart data
 * [POS]: Admin API for dashboard
 */

import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiCookieAuth, ApiOkResponse } from '@nestjs/swagger';
import { RequireAdmin } from '../auth';
import { AdminService } from './admin.service';

@ApiTags('Admin')
@ApiCookieAuth()
@Controller({ path: 'admin/dashboard', version: VERSION_NEUTRAL })
@RequireAdmin()
export class AdminDashboardController {
  constructor(private readonly adminService: AdminService) {}

  /**
   * Get dashboard statistics
   */
  @Get()
  @ApiOperation({ summary: 'Get dashboard statistics' })
  @ApiOkResponse({ description: 'Dashboard statistics' })
  async getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  /**
   * Get chart data (last 7 days)
   */
  @Get('charts')
  @ApiOperation({ summary: 'Get chart data' })
  @ApiOkResponse({ description: 'Chart data' })
  async getChartData() {
    return this.adminService.getChartData();
  }
}
