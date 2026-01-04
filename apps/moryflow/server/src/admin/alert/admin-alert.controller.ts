/**
 * Admin Alert Controller
 * 管理后台告警 API
 *
 * [PROVIDES]: 告警规则 CRUD、告警历史查询、告警统计
 * [POS]: /admin/alerts
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../../common/guards';
import { AlertService, AlertDetectorService } from '../../alert';
import type {
  CreateAlertRuleDto,
  UpdateAlertRuleDto,
  GetAlertRulesQueryDto,
  GetAlertHistoryQueryDto,
} from '../../alert';
import { AlertRuleType, AlertLevel } from '../../../generated/prisma/client';

@Controller('admin/alerts')
@UseGuards(AdminGuard)
export class AdminAlertController {
  constructor(
    private readonly alertService: AlertService,
    private readonly alertDetectorService: AlertDetectorService,
  ) {}

  // ==========================================
  // 规则管理
  // ==========================================

  /**
   * 获取所有规则
   */
  @Get('rules')
  async getRules(@Query() query: GetAlertRulesQueryDto) {
    const rules = await this.alertService.getRules({
      type: query.type as AlertRuleType | undefined,
      enabled: query.enabled !== undefined ? query.enabled === true : undefined,
    });
    return { rules };
  }

  /**
   * 获取单个规则
   */
  @Get('rules/:id')
  async getRule(@Param('id') id: string) {
    const rule = await this.alertService.getRule(id);
    return { rule };
  }

  /**
   * 创建规则
   */
  @Post('rules')
  async createRule(@Body() dto: CreateAlertRuleDto) {
    const rule = await this.alertService.createRule(dto);
    return { rule };
  }

  /**
   * 更新规则
   */
  @Put('rules/:id')
  async updateRule(@Param('id') id: string, @Body() dto: UpdateAlertRuleDto) {
    const rule = await this.alertService.updateRule(id, dto);
    return { rule };
  }

  /**
   * 删除规则
   */
  @Delete('rules/:id')
  async deleteRule(@Param('id') id: string) {
    await this.alertService.deleteRule(id);
    return { success: true };
  }

  // ==========================================
  // 告警历史
  // ==========================================

  /**
   * 获取告警历史
   */
  @Get('history')
  async getHistory(@Query() query: GetAlertHistoryQueryDto) {
    const { history, total } = await this.alertService.getHistory({
      ruleId: query.ruleId,
      level: query.level as AlertLevel | undefined,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      limit: query.limit ? Number(query.limit) : 50,
      offset: query.offset ? Number(query.offset) : 0,
    });
    return { history, total };
  }

  // ==========================================
  // 统计和操作
  // ==========================================

  /**
   * 获取告警统计
   */
  @Get('stats')
  async getStats(@Query('days') days?: string) {
    const stats = await this.alertService.getStats(days ? Number(days) : 7);
    return stats;
  }

  /**
   * 手动触发告警检测
   */
  @Post('detect')
  async triggerDetection() {
    await this.alertDetectorService.triggerDetection();
    return { success: true, message: 'Detection triggered' };
  }
}
