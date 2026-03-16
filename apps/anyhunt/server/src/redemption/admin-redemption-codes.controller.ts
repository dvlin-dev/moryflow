/**
 * Admin Redemption Codes Controller
 */
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Query,
  Param,
  Body,
} from '@nestjs/common';
import {
  ApiTags,
  ApiSecurity,
  ApiOperation,
  ApiOkResponse,
  ApiParam,
} from '@nestjs/swagger';
import { RequireAdmin, CurrentUser } from '../auth';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { RedemptionService } from './redemption.service';
import {
  createRedemptionCodeSchema,
  updateRedemptionCodeSchema,
  redemptionCodeQuerySchema,
  type CreateRedemptionCodeDto,
  type UpdateRedemptionCodeDto,
  type RedemptionCodeQuery,
} from './redemption.dto';
import type { CurrentUserDto } from '../types';

@ApiTags('Admin - Redemption Codes')
@ApiSecurity('session')
@Controller({ path: 'admin/redemption-codes', version: '1' })
@RequireAdmin()
export class AdminRedemptionCodesController {
  constructor(private readonly redemptionService: RedemptionService) {}

  @Post()
  @ApiOperation({ summary: 'Create a redemption code' })
  @ApiOkResponse({ description: 'Created redemption code' })
  async createCode(
    @CurrentUser() currentUser: CurrentUserDto,
    @Body(new ZodValidationPipe(createRedemptionCodeSchema))
    dto: CreateRedemptionCodeDto,
  ) {
    return this.redemptionService.createCode(currentUser.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List redemption codes' })
  @ApiOkResponse({ description: 'Redemption code list with pagination' })
  async listCodes(
    @Query(new ZodValidationPipe(redemptionCodeQuerySchema))
    query: RedemptionCodeQuery,
  ) {
    return this.redemptionService.listCodes(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get redemption code details' })
  @ApiParam({ name: 'id', description: 'Redemption code ID' })
  @ApiOkResponse({ description: 'Redemption code details with usage history' })
  async getCode(@Param('id') id: string) {
    return this.redemptionService.getCode(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a redemption code' })
  @ApiParam({ name: 'id', description: 'Redemption code ID' })
  @ApiOkResponse({ description: 'Updated redemption code' })
  async updateCode(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateRedemptionCodeSchema))
    dto: UpdateRedemptionCodeDto,
  ) {
    return this.redemptionService.updateCode(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate a redemption code' })
  @ApiParam({ name: 'id', description: 'Redemption code ID' })
  @ApiOkResponse({ description: 'Deactivated' })
  async deactivateCode(@Param('id') id: string) {
    return this.redemptionService.deactivateCode(id);
  }
}
