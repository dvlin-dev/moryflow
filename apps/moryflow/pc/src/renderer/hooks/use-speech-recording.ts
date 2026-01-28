/**
 * [PROVIDES]: useSpeechRecording - 语音录制状态与控制
 * [DEPENDS]: MediaRecorder / speech-helper
 * [POS]: ChatPromptInput 语音录制基础能力
 * [UPDATE]: 2026-01-28 - disabled 变为 true 时强制终止录音并清理资源
 * [UPDATE]: 2026-01-28 - disabled 处理中确保 stopRecording Promise 可收敛
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  formatDuration,
  getSupportedMimeType,
  transcribeAudio,
  SpeechError,
} from '@/components/chat-pane/components/chat-prompt-input/speech-helper';

// ==================== 常量 ====================

/** 最大录音时长（秒），防止录制过长导致内存问题 */
const MAX_RECORDING_DURATION = 300;

// ==================== 类型定义 ====================

/** 录音状态 */
export type RecordingState = 'idle' | 'recording' | 'processing';

/** Hook 配置选项 */
export interface UseSpeechRecordingOptions {
  /** 转录成功回调 */
  onTranscribed?: (text: string) => void;
  /** 错误回调（调用方可根据 error.code 决定如何提示用户） */
  onError?: (error: Error) => void;
  /** 达到最大录音时长回调 */
  onMaxDuration?: () => void;
  /** 是否禁用 */
  disabled?: boolean;
}

/** Hook 返回值 */
export interface UseSpeechRecordingReturn {
  /** 当前录音状态 */
  recordingState: RecordingState;
  /** 录音时长（秒） */
  recordingDuration: number;
  /** 格式化的录音时长（MM:SS） */
  formattedDuration: string;
  /** 是否正在录音 */
  isRecording: boolean;
  /** 是否正在处理（转录中） */
  isProcessing: boolean;
  /** 是否处于活跃状态（录音或处理中） */
  isActive: boolean;
  /** 开始录音 */
  startRecording: () => void;
  /** 停止录音并转录 */
  stopRecording: () => Promise<void>;
  /** 切换录音状态 */
  toggleRecording: () => void;
  /** 处理 LiveWaveform stream 就绪回调 */
  handleStreamReady: (stream: MediaStream) => void;
  /** 处理 LiveWaveform 错误回调 */
  handleWaveformError: (error: Error) => void;
}

// ==================== Hook 实现 ====================

export function useSpeechRecording(
  options: UseSpeechRecordingOptions = {}
): UseSpeechRecordingReturn {
  const { onTranscribed, onError, onMaxDuration, disabled = false } = options;

  // -------------------- 状态 --------------------
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [recordingDuration, setRecordingDuration] = useState(0);

  // -------------------- Refs --------------------
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const durationIntervalRef = useRef<number | null>(null);
  /** 会话 ID，用于防止旧的 ondataavailable 事件污染新录音数据 */
  const sessionIdRef = useRef(0);
  /** stopRecording 的稳定引用，用于计时器回调 */
  const stopRecordingRef = useRef<() => void>(() => {});
  /** stopRecording 的 Promise 控制，避免强制清理时悬挂 */
  const stopPromiseRef = useRef<{ resolve: () => void; settled: boolean } | null>(null);

  // -------------------- 派生状态 --------------------
  const isRecording = recordingState === 'recording';
  const isProcessing = recordingState === 'processing';
  const isActive = isRecording || isProcessing;
  const formattedDuration = formatDuration(recordingDuration);

  // -------------------- 计时器管理 --------------------

  /** 停止录音计时器 */
  const stopDurationTimer = useCallback(() => {
    if (durationIntervalRef.current !== null) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
  }, []);

  /** 确保 stopRecording Promise 收敛 */
  const finalizeStopPromise = useCallback(() => {
    const pending = stopPromiseRef.current;
    if (!pending || pending.settled) {
      return;
    }
    pending.settled = true;
    pending.resolve();
    stopPromiseRef.current = null;
  }, []);

  /** 开始录音计时器（带时长上限保护） */
  const startDurationTimer = useCallback(() => {
    setRecordingDuration(0);
    durationIntervalRef.current = window.setInterval(() => {
      setRecordingDuration((prev) => {
        const next = prev + 1;
        if (next >= MAX_RECORDING_DURATION) {
          // 达到上限，触发停止
          onMaxDuration?.();
          stopRecordingRef.current();
        }
        return next;
      });
    }, 1000);
  }, [onMaxDuration]);

  // -------------------- 资源清理 --------------------

  /** 清理所有录音资源 */
  const cleanupRecording = useCallback(() => {
    stopDurationTimer();

    // 清理 MediaRecorder
    const recorder = mediaRecorderRef.current;
    if (recorder) {
      if (recorder.state !== 'inactive') {
        try {
          recorder.stop();
        } catch {
          // MediaRecorder already stopped, ignore
        }
      }
      recorder.ondataavailable = null;
      recorder.onstop = null;
      mediaRecorderRef.current = null;
    }

    // 停止所有音轨
    const stream = streamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    chunksRef.current = [];
  }, [stopDurationTimer]);

  // -------------------- Stream 处理 --------------------

  /** 处理 LiveWaveform 的 stream 就绪回调 */
  const handleStreamReady = useCallback((stream: MediaStream) => {
    // 清理旧的 MediaRecorder
    const oldRecorder = mediaRecorderRef.current;
    if (oldRecorder && oldRecorder.state !== 'inactive') {
      try {
        oldRecorder.stop();
      } catch {
        // Already stopped, ignore
      }
    }

    // 生成新的会话 ID，确保旧事件不会污染新数据
    const currentSessionId = ++sessionIdRef.current;
    chunksRef.current = [];

    // 创建新的 MediaRecorder
    streamRef.current = stream;
    const mimeType = getSupportedMimeType();
    const recorder = new MediaRecorder(stream, { mimeType });

    recorder.ondataavailable = (event) => {
      // 只接受当前会话的数据
      if (event.data.size > 0 && sessionIdRef.current === currentSessionId) {
        chunksRef.current.push(event.data);
      }
    };

    mediaRecorderRef.current = recorder;
    recorder.start(1000); // 每秒触发一次 ondataavailable
  }, []);

  /** 处理波形组件错误 */
  const handleWaveformError = useCallback(
    (error: Error) => {
      onError?.(new SpeechError('Microphone access denied', 'NETWORK_ERROR', error));
      cleanupRecording();
      setRecordingState('idle');
    },
    [cleanupRecording, onError]
  );

  // -------------------- 录音控制 --------------------

  /** 开始录音 */
  const startRecording = useCallback(() => {
    if (disabled || recordingState !== 'idle') return;

    chunksRef.current = [];
    setRecordingState('recording');
    startDurationTimer();
  }, [disabled, recordingState, startDurationTimer]);

  /** 停止录音并转录 */
  const stopRecording = useCallback(async () => {
    if (recordingState !== 'recording') return;

    stopDurationTimer();
    setRecordingState('processing');

    const recorder = mediaRecorderRef.current;
    if (!recorder) {
      onError?.(new SpeechError('MediaRecorder not initialized', 'TRANSCRIPTION_ERROR'));
      cleanupRecording();
      setRecordingState('idle');
      return;
    }

    return new Promise<void>((resolve) => {
      stopPromiseRef.current = { resolve, settled: false };
      recorder.onstop = async () => {
        try {
          const mimeType = recorder.mimeType || getSupportedMimeType();
          const audioBlob = new Blob(chunksRef.current, { type: mimeType });

          if (audioBlob.size === 0) {
            throw new SpeechError('No audio data recorded', 'TRANSCRIPTION_ERROR');
          }

          const result = await transcribeAudio({
            audioBlob,
            mimeType,
            saveRawAudio: false,
          });

          if (result.text) {
            onTranscribed?.(result.text);
          }
        } catch (error) {
          if (error instanceof SpeechError) {
            onError?.(error);
          } else {
            onError?.(
              new SpeechError(
                error instanceof Error ? error.message : 'Transcription failed',
                'TRANSCRIPTION_ERROR',
                error
              )
            );
          }
        } finally {
          cleanupRecording();
          setRecordingState('idle');
          finalizeStopPromise();
        }
      };

      recorder.stop();
    });
  }, [
    recordingState,
    stopDurationTimer,
    cleanupRecording,
    onTranscribed,
    onError,
    finalizeStopPromise,
  ]);

  // 保持 stopRecording 的稳定引用
  stopRecordingRef.current = stopRecording;

  /** 切换录音状态 */
  const toggleRecording = useCallback(() => {
    if (recordingState === 'idle') {
      startRecording();
    } else if (recordingState === 'recording') {
      stopRecording();
    }
  }, [recordingState, startRecording, stopRecording]);

  // -------------------- 生命周期 --------------------

  // 组件卸载时清理资源
  useEffect(() => {
    return () => {
      cleanupRecording();
    };
  }, [cleanupRecording]);

  // disabled 变为 true 时强制终止录音（防止登出后仍占用麦克风）
  useEffect(() => {
    if (!disabled || recordingState === 'idle') return;
    if (recordingState === 'processing') {
      finalizeStopPromise();
    }
    cleanupRecording();
    setRecordingState('idle');
    setRecordingDuration(0);
  }, [cleanupRecording, disabled, finalizeStopPromise, recordingState]);

  // -------------------- 返回值 --------------------

  return {
    recordingState,
    recordingDuration,
    formattedDuration,
    isRecording,
    isProcessing,
    isActive,
    startRecording,
    stopRecording,
    toggleRecording,
    handleStreamReady,
    handleWaveformError,
  };
}
