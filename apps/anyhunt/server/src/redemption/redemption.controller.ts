/**
 * Redemption Codes User Controller
 */
import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { CurrentUser } from '../auth';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { RedemptionService } from './redemption.service';
import { redeemCodeSchema, type RedeemCodeDto } from './redemption.dto';
import type { CurrentUserDto } from '../types';

@ApiTags('Redemption Codes')
@Controller({ path: 'app/redemption-codes', version: '1' })
export class RedemptionController {
  constructor(private readonly redemptionService: RedemptionService) {}

  @Post('redeem')
  @ApiOperation({ summary: 'Redeem a code' })
  @ApiOkResponse({ description: 'Redemption result' })
  async redeemCode(
    @CurrentUser() user: CurrentUserDto,
    @Body(new ZodValidationPipe(redeemCodeSchema)) dto: RedeemCodeDto,
  ) {
    return this.redemptionService.redeemCode(user.id, dto.code);
  }
}
