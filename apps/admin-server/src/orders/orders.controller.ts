import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtGuard } from '@aiget/auth-server';
import { AdminGuard } from '../common/guards/admin.guard';
import { OrdersService } from './orders.service';
import { ListOrdersQuerySchema } from './dto';

@Controller('admin/orders')
@UseGuards(JwtGuard, AdminGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  async listOrders(@Query() query: Record<string, unknown>) {
    const parsed = ListOrdersQuerySchema.parse(query);
    return this.ordersService.listOrders(parsed);
  }

  @Get(':id')
  async getOrderById(@Param('id') id: string) {
    return this.ordersService.getOrderById(id);
  }
}
