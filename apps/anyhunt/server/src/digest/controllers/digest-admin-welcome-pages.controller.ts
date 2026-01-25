/**
 * Digest Admin Welcome Pages Controller
 *
 * [INPUT]: page CRUD payload / reorder payload
 * [OUTPUT]: welcome pages list
 * [POS]: Admin Welcome Pages 管理（RequireAdmin）
 */

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { RequireAdmin } from '../../auth';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { DigestWelcomePagesService } from '../services';
import {
  CreateWelcomePageSchema,
  ReorderWelcomePagesSchema,
  UpdateWelcomePageSchema,
  type CreateWelcomePageInput,
  type ReorderWelcomePagesInput,
  type UpdateWelcomePageInput,
} from '../dto';

@ApiTags('Admin - Digest Welcome')
@ApiSecurity('session')
@Controller({ path: 'admin/digest/welcome/pages', version: '1' })
@RequireAdmin()
export class DigestAdminWelcomePagesController {
  constructor(
    private readonly welcomePagesService: DigestWelcomePagesService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List welcome pages (admin)' })
  @ApiOkResponse({ description: 'Welcome pages list' })
  async listPages() {
    return this.welcomePagesService.listAdminPages();
  }

  @Post()
  @ApiOperation({ summary: 'Create welcome page (admin)' })
  @ApiOkResponse({ description: 'Created page id' })
  async createPage(
    @Body(new ZodValidationPipe(CreateWelcomePageSchema))
    input: CreateWelcomePageInput,
  ) {
    const id = await this.welcomePagesService.createAdminPage(input);
    return { id };
  }

  @Put('reorder')
  @ApiOperation({ summary: 'Reorder welcome pages (admin)' })
  @ApiOkResponse({ description: 'OK' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async reorderPages(
    @Body(new ZodValidationPipe(ReorderWelcomePagesSchema))
    input: ReorderWelcomePagesInput,
  ): Promise<void> {
    await this.welcomePagesService.reorderAdminPages(input.ids);
    return;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update welcome page (admin)' })
  @ApiOkResponse({ description: 'OK' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async updatePage(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateWelcomePageSchema))
    input: UpdateWelcomePageInput,
  ): Promise<void> {
    await this.welcomePagesService.updateAdminPage(id, input);
    return;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete welcome page (admin)' })
  @ApiOkResponse({ description: 'OK' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePage(@Param('id') id: string): Promise<void> {
    await this.welcomePagesService.deleteAdminPage(id);
    return;
  }
}
