/**
 * [INPUT]: 视频源 URL / 本地音频文件 / 云端配置
 * [OUTPUT]: 本地或云端转写结果 + 产物文件
 * [POS]: Video Transcript 执行器（下载、音频抽取、转写、文件生成）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import os from 'node:os';
import path from 'node:path';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import {
  VIDEO_TRANSCRIPT_CLOUD_JOB_TIMEOUT_MS,
  VIDEO_TRANSCRIPT_LOCAL_JOB_TIMEOUT_MS,
} from './video-transcript.constants';
import { VideoTranscriptCommandService } from './video-transcript-command.service';
import type {
  VideoTranscriptCloudOutput,
  VideoTranscriptLocalOutput,
  VideoTranscriptSegment,
} from './video-transcript.types';

interface CloudTranscribeResponse {
  text: string;
  segments: VideoTranscriptSegment[];
  languageDetected?: string;
  raw: unknown;
}

@Injectable()
export class VideoTranscriptExecutorService {
  constructor(
    private readonly configService: ConfigService,
    private readonly commandService: VideoTranscriptCommandService,
  ) {}

  async createWorkspace(taskId: string): Promise<string> {
    const dir = path.join(os.tmpdir(), 'anyhunt-video-transcript', taskId);
    await mkdir(dir, { recursive: true });
    return dir;
  }

  async cleanupWorkspace(workspaceDir: string): Promise<void> {
    await rm(workspaceDir, { recursive: true, force: true });
  }

  async downloadVideo(
    sourceUrl: string,
    workspaceDir: string,
  ): Promise<string> {
    const ytDlpCmd = this.configService.get<string>(
      'VIDEO_TRANSCRIPT_YTDLP_CMD',
      'yt-dlp',
    );
    const outputTemplate = path.join(workspaceDir, 'video.%(ext)s');

    await this.commandService.run(
      ytDlpCmd,
      [
        '--no-playlist',
        '--no-warnings',
        '--no-progress',
        '--restrict-filenames',
        '--output',
        outputTemplate,
        sourceUrl,
      ],
      {
        timeoutMs: VIDEO_TRANSCRIPT_LOCAL_JOB_TIMEOUT_MS,
      },
    );

    const files = await readdir(workspaceDir);
    const videoFile = files.find(
      (name) => name.startsWith('video.') && !name.endsWith('.part'),
    );

    if (!videoFile) {
      throw new Error('Video download succeeded but no output file found');
    }

    return path.join(workspaceDir, videoFile);
  }

  async probeVideoDurationSeconds(sourceUrl: string): Promise<number> {
    const ytDlpCmd = this.configService.get<string>(
      'VIDEO_TRANSCRIPT_YTDLP_CMD',
      'yt-dlp',
    );

    try {
      const result = await this.commandService.run(
        ytDlpCmd,
        [
          '--no-playlist',
          '--no-warnings',
          '--no-progress',
          '--skip-download',
          '--print',
          '%(duration)s',
          sourceUrl,
        ],
        {
          timeoutMs: 30 * 1000,
        },
      );

      const lines = result.stdout
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

      for (let i = lines.length - 1; i >= 0; i -= 1) {
        const duration = Number(lines[i]);
        if (Number.isFinite(duration) && duration > 0) {
          return Number(duration.toFixed(3));
        }
      }

      return 0;
    } catch {
      return 0;
    }
  }

  async extractAudio(videoPath: string, audioPath: string): Promise<void> {
    const ffmpegCmd = this.configService.get<string>(
      'VIDEO_TRANSCRIPT_FFMPEG_CMD',
      'ffmpeg',
    );

    await this.commandService.run(
      ffmpegCmd,
      [
        '-y',
        '-i',
        videoPath,
        '-vn',
        '-acodec',
        'pcm_s16le',
        '-ar',
        '16000',
        '-ac',
        '1',
        audioPath,
      ],
      {
        timeoutMs: VIDEO_TRANSCRIPT_LOCAL_JOB_TIMEOUT_MS,
      },
    );
  }

  async getAudioDurationSeconds(audioPath: string): Promise<number> {
    const ffprobeCmd = this.configService.get<string>(
      'VIDEO_TRANSCRIPT_FFPROBE_CMD',
      'ffprobe',
    );

    const result = await this.commandService.run(
      ffprobeCmd,
      [
        '-v',
        'error',
        '-show_entries',
        'format=duration',
        '-of',
        'default=noprint_wrappers=1:nokey=1',
        audioPath,
      ],
      {
        timeoutMs: 30 * 1000,
      },
    );

    const duration = Number(result.stdout.trim());
    if (!Number.isFinite(duration) || duration < 0) {
      return 0;
    }

    return Number(duration.toFixed(3));
  }

  async transcribeLocal(
    audioPath: string,
    outputPrefix: string,
  ): Promise<VideoTranscriptLocalOutput> {
    const whisperCmd = this.configService.get<string>(
      'VIDEO_TRANSCRIPT_LOCAL_WHISPER_CMD',
      'whisper-cli',
    );
    const modelPath = this.configService.get<string>(
      'VIDEO_TRANSCRIPT_LOCAL_WHISPER_MODEL_PATH',
      '',
    );

    if (!modelPath) {
      throw new Error('Missing VIDEO_TRANSCRIPT_LOCAL_WHISPER_MODEL_PATH');
    }

    await this.commandService.run(
      whisperCmd,
      [
        '-m',
        modelPath,
        '-f',
        audioPath,
        '-of',
        outputPrefix,
        '-otxt',
        '-oj',
        '-osrt',
        '-l',
        'auto',
      ],
      {
        timeoutMs: VIDEO_TRANSCRIPT_LOCAL_JOB_TIMEOUT_MS,
      },
    );

    const txtPath = `${outputPrefix}.txt`;
    const jsonPath = `${outputPrefix}.json`;
    const srtPath = `${outputPrefix}.srt`;

    const txt = await this.readTextFileSafe(txtPath);
    const jsonRaw = await this.readTextFileSafe(jsonPath);

    let parsedText = txt;
    let segments: VideoTranscriptSegment[] = [];
    let languageDetected: string | undefined;

    if (jsonRaw) {
      try {
        const parsed = JSON.parse(jsonRaw) as {
          text?: unknown;
          language?: unknown;
          segments?: Array<{ start?: unknown; end?: unknown; text?: unknown }>;
        };

        if (typeof parsed.text === 'string' && parsed.text.trim().length > 0) {
          parsedText = parsed.text;
        }

        if (typeof parsed.language === 'string' && parsed.language.trim()) {
          languageDetected = parsed.language;
        }

        if (Array.isArray(parsed.segments)) {
          segments = parsed.segments
            .map((segment) => {
              const start = Number(segment.start ?? 0);
              const end = Number(segment.end ?? 0);
              const text =
                typeof segment.text === 'string' ? segment.text.trim() : '';
              if (!Number.isFinite(start) || !Number.isFinite(end) || !text) {
                return null;
              }

              return { start, end, text } satisfies VideoTranscriptSegment;
            })
            .filter(
              (segment): segment is VideoTranscriptSegment => segment !== null,
            );
        }
      } catch {
        // ignore invalid JSON and fallback to txt output
      }
    }

    if (!parsedText?.trim()) {
      throw new Error('Local whisper output is empty');
    }

    const srtText =
      (await this.readTextFileSafe(srtPath)) ||
      this.buildSrtFromSegments(segments);
    if (!srtText) {
      await writeFile(
        srtPath,
        this.buildSrtFromSegments([{ start: 0, end: 1, text: parsedText }]),
        'utf-8',
      );
    }

    if (!jsonRaw) {
      await writeFile(
        jsonPath,
        JSON.stringify(
          {
            text: parsedText,
            language: languageDetected,
            segments,
          },
          null,
          2,
        ),
        'utf-8',
      );
    }

    if (!txt) {
      await writeFile(txtPath, parsedText, 'utf-8');
    }

    return {
      text: parsedText,
      segments,
      languageDetected,
      txtPath,
      jsonPath,
      srtPath,
    };
  }

  async transcribeCloud(
    audioPath: string,
    outputPrefix: string,
  ): Promise<VideoTranscriptCloudOutput> {
    const accountId = this.configService.get<string>('CF_ACCOUNT_ID', '');
    const apiToken = this.configService.get<string>(
      'CF_WORKERS_AI_API_TOKEN',
      '',
    );

    if (!accountId || !apiToken) {
      throw new Error('Missing CF_ACCOUNT_ID or CF_WORKERS_AI_API_TOKEN');
    }

    const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/openai/whisper-large-v3-turbo`;
    const audioBuffer = await readFile(audioPath);

    const form = new FormData();
    form.append('file', new Blob([audioBuffer]), path.basename(audioPath));

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
      body: form,
      signal: AbortSignal.timeout(VIDEO_TRANSCRIPT_CLOUD_JOB_TIMEOUT_MS),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Workers AI request failed (${response.status}): ${body.slice(0, 500)}`,
      );
    }

    const payload = (await response.json()) as Record<string, unknown>;
    const normalized = this.normalizeCloudResponse(payload);

    const txtPath = `${outputPrefix}.txt`;
    const jsonPath = `${outputPrefix}.json`;
    const srtPath = `${outputPrefix}.srt`;

    await writeFile(txtPath, normalized.text, 'utf-8');
    await writeFile(
      jsonPath,
      JSON.stringify(
        {
          text: normalized.text,
          languageDetected: normalized.languageDetected,
          segments: normalized.segments,
          raw: normalized.raw,
        },
        null,
        2,
      ),
      'utf-8',
    );
    await writeFile(
      srtPath,
      this.buildSrtFromSegments(normalized.segments),
      'utf-8',
    );

    return {
      text: normalized.text,
      segments: normalized.segments,
      languageDetected: normalized.languageDetected,
      txtPath,
      jsonPath,
      srtPath,
    };
  }

  private normalizeCloudResponse(
    payload: Record<string, unknown>,
  ): CloudTranscribeResponse {
    const result =
      typeof payload.result === 'object' && payload.result !== null
        ? (payload.result as Record<string, unknown>)
        : payload;

    const textCandidate =
      (typeof result.text === 'string' && result.text) ||
      (typeof result.transcription === 'string' && result.transcription) ||
      '';

    const segmentsRaw = Array.isArray(result.segments)
      ? result.segments
      : Array.isArray(result.words)
        ? result.words
        : [];

    const segments = segmentsRaw
      .map((segment) => {
        if (typeof segment !== 'object' || segment === null) {
          return null;
        }

        const start = Number((segment as Record<string, unknown>).start ?? 0);
        const end = Number((segment as Record<string, unknown>).end ?? 0);
        const text =
          typeof (segment as Record<string, unknown>).text === 'string'
            ? String((segment as Record<string, unknown>).text).trim()
            : '';

        if (!Number.isFinite(start) || !Number.isFinite(end) || !text) {
          return null;
        }

        return { start, end, text } satisfies VideoTranscriptSegment;
      })
      .filter((segment): segment is VideoTranscriptSegment => segment !== null);

    const languageDetected =
      typeof result.language === 'string'
        ? result.language
        : typeof result.language_detected === 'string'
          ? result.language_detected
          : undefined;

    const text =
      textCandidate ||
      segments
        .map((segment) => segment.text)
        .join(' ')
        .trim();

    if (!text) {
      throw new Error('Workers AI response does not contain transcript text');
    }

    return {
      text,
      segments,
      languageDetected,
      raw: payload,
    };
  }

  private buildSrtFromSegments(segments: VideoTranscriptSegment[]): string {
    if (segments.length === 0) {
      return '';
    }

    return segments
      .map((segment, index) => {
        const line = index + 1;
        const start = this.toSrtTimestamp(segment.start);
        const end = this.toSrtTimestamp(segment.end);
        return `${line}\n${start} --> ${end}\n${segment.text}`;
      })
      .join('\n\n');
  }

  private toSrtTimestamp(seconds: number): string {
    const safe = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
    const totalMs = Math.round(safe * 1000);
    const hours = Math.floor(totalMs / 3_600_000);
    const minutes = Math.floor((totalMs % 3_600_000) / 60_000);
    const secs = Math.floor((totalMs % 60_000) / 1000);
    const ms = totalMs % 1000;

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
  }

  private async readTextFileSafe(filePath: string): Promise<string> {
    try {
      return await readFile(filePath, 'utf-8');
    } catch {
      return '';
    }
  }
}
