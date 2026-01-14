/**
 * Admin Digest Controller
 *
 * [PROPS]: RequireAdmin
 * [EMITS]: Topic 管理操作
 * [POS]: Admin 精选话题管理 API
 */

import {
  Controller,
  Get,
  Patch,
  Post,
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
import { AdminDigestService } from './admin-digest.service';
import {
  digestTopicQuerySchema,
  setFeaturedSchema,
  reorderFeaturedSchema,
  type DigestTopicQuery,
  type SetFeaturedDto,
  type ReorderFeaturedDto,
} from './dto';

@ApiTags('Admin - Digest')
@ApiSecurity('session')
@Controller({ path: 'admin/digest', version: '1' })
@RequireAdmin()
export class AdminDigestController {
  constructor(private readonly adminDigestService: AdminDigestService) {}

  @Get('topics')
  @ApiOperation({ summary: 'Get topic list with pagination' })
  @ApiOkResponse({ description: 'Topic list with pagination' })
  async getTopics(
    @Query(new ZodValidationPipe(digestTopicQuerySchema))
    query: DigestTopicQuery,
  ) {
    return this.adminDigestService.getTopics(query);
  }

  @Get('topics/featured')
  @ApiOperation({ summary: 'Get featured topics' })
  @ApiOkResponse({ description: 'Featured topic list' })
  async getFeaturedTopics() {
    return this.adminDigestService.getFeaturedTopics();
  }

  @Get('topics/:id')
  @ApiOperation({ summary: 'Get topic by ID' })
  @ApiParam({ name: 'id', description: 'Topic ID' })
  @ApiOkResponse({ description: 'Topic details' })
  async getTopic(@Param('id') id: string) {
    return this.adminDigestService.getTopic(id);
  }

  @Patch('topics/:id/featured')
  @ApiOperation({ summary: 'Set or unset topic as featured' })
  @ApiParam({ name: 'id', description: 'Topic ID' })
  @ApiOkResponse({ description: 'Updated topic' })
  async setFeatured(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(setFeaturedSchema)) dto: SetFeaturedDto,
  ) {
    const adminUserId = user.id;
    return this.adminDigestService.setFeatured(id, adminUserId, dto);
  }

  @Post('topics/featured/reorder')
  @ApiOperation({ summary: 'Reorder featured topics' })
  @ApiOkResponse({ description: 'Reordered featured topic list' })
  async reorderFeatured(
    @Body(new ZodValidationPipe(reorderFeaturedSchema)) dto: ReorderFeaturedDto,
  ) {
    return this.adminDigestService.reorderFeatured(dto);
  }
}
