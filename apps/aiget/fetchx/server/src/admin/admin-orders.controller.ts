/**
 * Admin Orders Controller
 * 订单管理 API
 */

import { Controller, Get, Query, Param } from '@nestjs/common';
import {
  ApiTags,
  ApiSecurity,
  ApiOperation,
  ApiOkResponse,
  ApiParam,
} from '@nestjs/swagger';
import { RequireAdmin } from '../auth';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { AdminService } from './admin.service';
import { orderQuerySchema, type OrderQuery } from './dto';

@ApiTags('Admin - Orders')
@ApiSecurity('session')
@Controller({ path: 'admin/orders', version: '1' })
@RequireAdmin()
export class AdminOrdersController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  @ApiOperation({ summary: 'Get order list' })
  @ApiOkResponse({ description: 'Order list with pagination' })
  async getOrders(
    @Query(new ZodValidationPipe(orderQuerySchema)) query: OrderQuery,
  ) {
    return this.adminService.getOrders(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiOkResponse({ description: 'Order details' })
  async getOrder(@Param('id') id: string) {
    return this.adminService.getOrder(id);
  }
}
