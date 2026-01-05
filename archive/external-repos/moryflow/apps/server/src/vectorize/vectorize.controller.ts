/**
 * Vectorize Controller
 * 向量化 API
 */

import {
  Controller,
  Post,
  Delete,
  Get,
  Body,
  Param,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { VectorizeService } from './vectorize.service';
import {
  VectorizeFileSchema,
  type VectorizeFileDto,
  type VectorizeResponseDto,
  type VectorizeStatusResponseDto,
} from './dto/vectorize.dto';
import type { AuthenticatedRequest } from '../types';

@ApiTags('vectorize')
@Controller('api/vectorize')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class VectorizeController {
  constructor(private readonly vectorizeService: VectorizeService) {}

  @Post('file')
  @ApiOperation({ summary: '向量化文件' })
  async vectorizeFile(
    @Req() req: AuthenticatedRequest,
    @Body() body: VectorizeFileDto,
  ): Promise<VectorizeResponseDto> {
    const parsed = VectorizeFileSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message);
    }
    return this.vectorizeService.queueVectorize(req.user.id, parsed.data);
  }

  @Get('status/:fileId')
  @ApiOperation({ summary: '获取向量化状态' })
  async getStatus(
    @Req() req: AuthenticatedRequest,
    @Param('fileId') fileId: string,
  ): Promise<VectorizeStatusResponseDto> {
    return this.vectorizeService.getStatus(req.user.id, fileId);
  }

  @Delete('file/:fileId')
  @ApiOperation({ summary: '删除文件向量' })
  async deleteVector(
    @Req() req: AuthenticatedRequest,
    @Param('fileId') fileId: string,
  ): Promise<{ success: boolean }> {
    await this.vectorizeService.deleteVector(req.user.id, fileId);
    return { success: true };
  }
}
