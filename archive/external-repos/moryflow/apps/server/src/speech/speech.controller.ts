/**
 * Speech Controller
 * 语音转录 API
 */

import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Req,
  Res,
  BadRequestException,
  NotFoundException,
  HttpException,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import {
  SpeechService,
  SpeechException,
  SpeechErrorCode,
} from './speech.service';
import { TranscribeSchema, type TranscribeResponseDto } from './dto';
import type { AuthenticatedRequest } from '../types';

/** 最大文件大小：25MB（Groq 免费层限制） */
const MAX_FILE_SIZE = 25 * 1024 * 1024;

// ==================== 错误码映射 ====================

const ERROR_CODE_TO_HTTP_STATUS: Record<SpeechErrorCode, HttpStatus> = {
  [SpeechErrorCode.NOT_CONFIGURED]: HttpStatus.SERVICE_UNAVAILABLE,
  [SpeechErrorCode.UNSUPPORTED_FORMAT]: HttpStatus.BAD_REQUEST,
  [SpeechErrorCode.FILE_NOT_FOUND]: HttpStatus.NOT_FOUND,
  [SpeechErrorCode.TRANSCRIPTION_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,
  [SpeechErrorCode.FILE_TOO_LARGE]: HttpStatus.PAYLOAD_TOO_LARGE,
};

// ==================== 控制器实现 ====================

@ApiTags('speech')
@Controller('api/speech')
export class SpeechController {
  constructor(private readonly speechService: SpeechService) {}

  /**
   * 将 SpeechException 转换为 HttpException
   */
  private toHttpException(error: SpeechException): HttpException {
    const status =
      ERROR_CODE_TO_HTTP_STATUS[error.code] ?? HttpStatus.INTERNAL_SERVER_ERROR;
    return new HttpException(
      {
        message: error.message,
        code: error.code,
      },
      status,
    );
  }

  @Post('transcribe')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(
    FileInterceptor('audio', { limits: { fileSize: MAX_FILE_SIZE } }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: '转录音频文件' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        audio: {
          type: 'string',
          format: 'binary',
          description: '音频文件',
        },
        rawAudio: {
          type: 'string',
          enum: ['true', 'false'],
          description: '是否保存原始音频',
        },
      },
      required: ['audio'],
    },
  })
  async transcribe(
    @Req() req: AuthenticatedRequest,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: Record<string, string>,
  ): Promise<TranscribeResponseDto> {
    // 验证文件
    if (!file) {
      throw new BadRequestException('Audio file is required');
    }

    // 解析 rawAudio 参数
    const parsed = TranscribeSchema.safeParse(body);
    const rawAudio = parsed.success ? parsed.data.rawAudio : false;

    try {
      return await this.speechService.transcribe(
        req.user.id,
        file.buffer,
        file.mimetype,
        rawAudio,
      );
    } catch (error) {
      if (error instanceof SpeechException) {
        throw this.toHttpException(error);
      }
      throw error;
    }
  }

  @Get('audio/:id')
  @ApiOperation({ summary: '获取音频文件' })
  async getAudio(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ): Promise<void> {
    const result = await this.speechService.getAudioFile(id);

    if (!result) {
      throw new NotFoundException('Audio file not found');
    }

    res.set({
      'Content-Type': result.mimeType,
      'Content-Length': result.buffer.length,
      'Cache-Control': 'public, max-age=31536000',
    });
    res.send(result.buffer);
  }
}
