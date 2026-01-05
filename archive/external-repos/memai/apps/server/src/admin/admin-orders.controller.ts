/**
 * Admin Orders Controller
 *
 * [INPUT]: Order query requests
 * [OUTPUT]: Order data
 * [POS]: Admin API for order management
 */

import {
  Controller,
  Get,
  Query,
  Param,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiCookieAuth, ApiParam, ApiOkResponse } from '@nestjs/swagger';
import { RequireAdmin } from '../auth';
import { AdminService } from './admin.service';
import { OrderQueryDto } from './dto';

@ApiTags('Admin')
@ApiCookieAuth()
@Controller({ path: 'admin/orders', version: VERSION_NEUTRAL })
@RequireAdmin()
export class AdminOrdersController {
  constructor(private readonly adminService: AdminService) {}

  /**
   * Get orders list
   */
  @Get()
  @ApiOperation({ summary: 'Get orders list' })
  @ApiOkResponse({ description: 'List of orders' })
  async getOrders(@Query() query: OrderQueryDto) {
    return this.adminService.getOrders(query);
  }

  /**
   * Get single order
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID' })
  @ApiOkResponse({ description: 'Order details' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  async getOrder(@Param('id') id: string) {
    return this.adminService.getOrder(id);
  }
}
