import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { CurrentUser } from '../auth';
import type { CurrentUserDto } from '../types';
import { RedemptionProxyService } from './redemption-proxy.service';

@ApiTags('Redemption Codes')
@Controller({ path: 'app/redemption-codes', version: '1' })
export class RedemptionProxyController {
  constructor(
    private readonly redemptionProxyService: RedemptionProxyService,
  ) {}

  @Post('redeem')
  @ApiOperation({ summary: 'Redeem a code' })
  @ApiOkResponse({ description: 'Redemption result' })
  async redeemCode(
    @CurrentUser() user: CurrentUserDto,
    @Body() body: { code: string },
  ) {
    return this.redemptionProxyService.redeem(user.id, body.code);
  }
}
