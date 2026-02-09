/**
 * [INPUT]: 外部命令与参数（yt-dlp / ffmpeg / whisper-cli / ffprobe）
 * [OUTPUT]: 标准输出与命令执行结果
 * [POS]: Video Transcript 外部命令执行器
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Injectable } from '@nestjs/common';
import { spawn } from 'node:child_process';

export interface VideoTranscriptCommandOptions {
  cwd?: string;
  timeoutMs?: number;
  env?: Record<string, string | undefined>;
}

export interface VideoTranscriptCommandResult {
  code: number;
  stdout: string;
  stderr: string;
}

@Injectable()
export class VideoTranscriptCommandService {
  async run(
    command: string,
    args: string[],
    options: VideoTranscriptCommandOptions = {},
  ): Promise<VideoTranscriptCommandResult> {
    return new Promise<VideoTranscriptCommandResult>((resolve, reject) => {
      const child = spawn(command, args, {
        cwd: options.cwd,
        env: {
          ...process.env,
          ...options.env,
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';
      let timedOut = false;

      const timeoutMs = options.timeoutMs ?? 15 * 60 * 1000;
      const timer = setTimeout(() => {
        timedOut = true;
        child.kill('SIGTERM');
        setTimeout(() => child.kill('SIGKILL'), 3000).unref();
      }, timeoutMs);

      child.stdout?.on('data', (chunk: Buffer | string) => {
        stdout += chunk.toString();
      });

      child.stderr?.on('data', (chunk: Buffer | string) => {
        stderr += chunk.toString();
      });

      child.on('error', (error) => {
        clearTimeout(timer);
        reject(
          new Error(
            `Failed to start command ${command}: ${error instanceof Error ? error.message : String(error)}`,
          ),
        );
      });

      child.on('close', (code, signal) => {
        clearTimeout(timer);

        if (timedOut) {
          reject(
            new Error(
              `Command timed out after ${timeoutMs}ms: ${command} ${args.join(' ')}`,
            ),
          );
          return;
        }

        if (code !== 0) {
          const reason = signal
            ? `signal=${signal}`
            : `exitCode=${code ?? 'unknown'}`;
          reject(
            new Error(
              `Command failed (${reason}): ${command} ${args.join(' ')}\n${stderr.trim()}`,
            ),
          );
          return;
        }

        resolve({
          code: code ?? 0,
          stdout,
          stderr,
        });
      });
    });
  }
}
