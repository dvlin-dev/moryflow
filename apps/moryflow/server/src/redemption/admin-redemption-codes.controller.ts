import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Query,
  Param,
  Body,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AdminGuard } from '../common/guards';
import { CurrentUser } from '../auth';
import type { CurrentUserDto } from '../types';
import { RedemptionService } from './redemption.service';
import {
  createRedemptionCodeSchema,
  updateRedemptionCodeSchema,
  redemptionCodeQuerySchema,
} from './redemption.dto';

@ApiTags('Admin - Redemption Codes')
@ApiBearerAuth()
@Controller({ path: 'admin/redemption-codes', version: '1' })
@UseGuards(AdminGuard)
export class AdminRedemptionCodesController {
  constructor(private readonly redemptionService: RedemptionService) {}

  @Get('config')
  @ApiOperation({ summary: 'Get redemption code configuration' })
  getConfig() {
    return this.redemptionService.getConfig();
  }

  @Post()
  @ApiOperation({ summary: 'Create a redemption code' })
  createCode(@CurrentUser() user: CurrentUserDto, @Body() body: unknown) {
    const parsed = createRedemptionCodeSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message);
    }
    return this.redemptionService.createCode(user.id, parsed.data);
  }

  @Get()
  @ApiOperation({ summary: 'List redemption codes' })
  listCodes(@Query() query: unknown) {
    const parsed = redemptionCodeQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message);
    }
    return this.redemptionService.listCodes(parsed.data);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get redemption code details' })
  getCode(@Param('id') id: string) {
    return this.redemptionService.getCode(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a redemption code' })
  updateCode(@Param('id') id: string, @Body() body: unknown) {
    const parsed = updateRedemptionCodeSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message);
    }
    return this.redemptionService.updateCode(id, parsed.data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate a redemption code' })
  deactivateCode(@Param('id') id: string) {
    return this.redemptionService.deactivateCode(id);
  }
}
