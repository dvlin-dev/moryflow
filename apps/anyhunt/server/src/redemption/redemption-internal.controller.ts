/**
 * Redemption Codes Internal Controller (API Key auth)
 */
import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiSecurity,
} from '@nestjs/swagger';
import { Public } from '../auth';
import { ApiKeyGuard } from '../api-key';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { RedemptionService } from './redemption.service';
import {
  internalRedeemCodeSchema,
  type InternalRedeemCodeDto,
} from './redemption.dto';

@ApiTags('Redemption Codes - Internal')
@ApiSecurity('apiKey')
@Public()
@Controller({ path: 'redemption-codes', version: '1' })
@UseGuards(ApiKeyGuard)
export class RedemptionInternalController {
  constructor(private readonly redemptionService: RedemptionService) {}

  @Post('redeem')
  @ApiOperation({
    summary: 'Redeem a code on behalf of a user (API Key auth)',
  })
  @ApiOkResponse({ description: 'Redemption result' })
  async redeemCode(
    @Body(new ZodValidationPipe(internalRedeemCodeSchema))
    dto: InternalRedeemCodeDto,
  ) {
    return this.redemptionService.redeemCode(dto.userId, dto.code);
  }
}
