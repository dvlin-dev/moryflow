import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { CurrentUser } from '../auth';
import type { CurrentUserDto } from '../types';
import { RedemptionService } from './redemption.service';
import { redeemCodeSchema } from './redemption.dto';

@ApiTags('Redemption Codes')
@Controller({ path: 'app/redemption-codes', version: '1' })
export class RedemptionController {
  constructor(private readonly redemptionService: RedemptionService) {}

  @Post('redeem')
  @ApiOperation({ summary: 'Redeem a code' })
  @ApiOkResponse({ description: 'Redemption result' })
  async redeemCode(@CurrentUser() user: CurrentUserDto, @Body() body: unknown) {
    const parsed = redeemCodeSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message);
    }
    return this.redemptionService.redeemCode(user.id, parsed.data.code);
  }
}
