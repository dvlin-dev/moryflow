/**
 * [PROVIDES]: useAudioRecorder - 音频录制 Hook
 * [DEPENDS]: expo-av, /i18n
 * [POS]: 提供录音功能，输出实时 metering 数据用于波形显示
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { Audio } from 'expo-av';
import { logError } from '@/lib/utils/error';
import { useTranslation } from '@moryflow/i18n';

// ==================== 类型定义 ====================

export type RecordingState = 'idle' | 'recording';

export interface UseAudioRecorderOptions {
  maxDuration?: number; // 最大录音时长（秒）
  onError?: (error: Error) => void;
}

export interface UseAudioRecorderReturn {
  // 状态
  isRecording: boolean;
  duration: number;
  formattedDuration: string;
  meteringLevels: number[]; // 归一化的音频电平数组 (0-1)
  hasPermission: boolean | null;

  // 操作
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string | null>; // 返回录音文件 URI
  cancelRecording: () => Promise<void>;
}

// ==================== 常量 ====================

const DEFAULT_MAX_DURATION = 300; // 5 分钟
const METERING_UPDATE_INTERVAL = 50; // 50ms 轮询间隔
const METERING_HISTORY_SIZE = 24; // 保留最近 24 个点

// ==================== 工具函数 ====================

/**
 * 将 metering 值（dB）归一化到 0-1 范围
 * metering 通常在 -160 到 0 之间，-40 以下基本听不到
 */
function normalizeMetering(metering: number): number {
  // metering 范围大约 -160 到 0，我们取 -50 到 0 作为有效范围
  const minDb = -50;
  const maxDb = 0;
  const clamped = Math.max(minDb, Math.min(maxDb, metering));
  return (clamped - minDb) / (maxDb - minDb);
}

/**
 * 格式化时间为 MM:SS
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// ==================== Hook 实现 ====================

export function useAudioRecorder(options: UseAudioRecorderOptions = {}): UseAudioRecorderReturn {
  const { maxDuration = DEFAULT_MAX_DURATION, onError } = options;

  const { t } = useTranslation('audio');
  const { t: tCommon } = useTranslation('common');

  // 状态
  const [state, setState] = useState<RecordingState>('idle');
  const [duration, setDuration] = useState(0);
  const [meteringLevels, setMeteringLevels] = useState<number[]>([]);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  // Refs
  const recordingRef = useRef<Audio.Recording | null>(null);
  const meteringIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isRecording = state === 'recording';
  const formattedDuration = formatTime(duration);

  // 检查权限
  const checkPermissions = useCallback(async (): Promise<boolean> => {
    try {
      const { status } = await Audio.getPermissionsAsync();

      if (status === 'granted') {
        setHasPermission(true);
        return true;
      }

      const { status: newStatus } = await Audio.requestPermissionsAsync();
      const granted = newStatus === 'granted';
      setHasPermission(granted);

      if (!granted) {
        Alert.alert(t('permissionRequired'), t('microphonePermissionNeeded'));
        onError?.(new Error('Microphone permission denied'));
      }

      return granted;
    } catch (error) {
      const err = error as Error;
      logError('Failed to request recording permission', err);
      Alert.alert(tCommon('error'), t('permissionRequestFailed'));
      onError?.(err);
      return false;
    }
  }, [onError, t, tCommon]);

  // 停止所有计时器
  const stopTimers = useCallback(() => {
    if (meteringIntervalRef.current) {
      clearInterval(meteringIntervalRef.current);
      meteringIntervalRef.current = null;
    }
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
  }, []);

  // 开始轮询 metering 数据
  const startMeteringPolling = useCallback(() => {
    meteringIntervalRef.current = setInterval(async () => {
      if (!recordingRef.current) return;

      try {
        const status = await recordingRef.current.getStatusAsync();
        if (status.isRecording && status.metering !== undefined) {
          const level = normalizeMetering(status.metering);
          setMeteringLevels((prev) => {
            const newLevels = [...prev, level];
            return newLevels.slice(-METERING_HISTORY_SIZE);
          });
        }
      } catch {
        // 忽略轮询错误
      }
    }, METERING_UPDATE_INTERVAL);
  }, []);

  // 开始时长计时
  const startDurationTimer = useCallback(() => {
    durationIntervalRef.current = setInterval(() => {
      setDuration((prev) => {
        const newDuration = prev + 1;
        // 达到最大时长，由外部处理停止
        return newDuration;
      });
    }, 1000);
  }, []);

  // 开始录音
  const startRecording = useCallback(async (): Promise<void> => {
    const permissionGranted = await checkPermissions();
    if (!permissionGranted) return;

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      const recordingOptions: Audio.RecordingOptions = {
        isMeteringEnabled: true, // 启用音频电平计量
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/mp4',
          bitsPerSecond: 128000,
        },
      };

      const { recording } = await Audio.Recording.createAsync(recordingOptions);
      recordingRef.current = recording;

      setState('recording');
      setDuration(0);
      setMeteringLevels([]);

      startMeteringPolling();
      startDurationTimer();
    } catch (error) {
      const err = error as Error;
      logError('Failed to start recording', err);
      Alert.alert(tCommon('error'), t('recordingStartError'));
      onError?.(err);
    }
  }, [checkPermissions, startMeteringPolling, startDurationTimer, onError, t, tCommon]);

  // 停止录音，返回文件 URI
  const stopRecording = useCallback(async (): Promise<string | null> => {
    if (!recordingRef.current || state !== 'recording') return null;

    stopTimers();

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();

      recordingRef.current = null;
      setState('idle');
      setMeteringLevels([]);

      return uri;
    } catch (error) {
      const err = error as Error;
      logError('Failed to stop recording', err);
      Alert.alert(tCommon('error'), t('recordingStopError'));
      onError?.(err);
      return null;
    }
  }, [state, stopTimers, onError, t, tCommon]);

  // 取消录音
  const cancelRecording = useCallback(async (): Promise<void> => {
    stopTimers();

    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
      } catch (error) {
        logError('Failed to cleanup during recording cancellation', error);
      }
      recordingRef.current = null;
    }

    setState('idle');
    setDuration(0);
    setMeteringLevels([]);
  }, [stopTimers]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      stopTimers();
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
      }
    };
  }, [stopTimers]);

  // 挂载时检查权限
  useEffect(() => {
    checkPermissions();
  }, [checkPermissions]);

  // 达到最大时长自动停止
  useEffect(() => {
    if (duration >= maxDuration && isRecording) {
      // 使用 ref 避免依赖 stopRecording 导致的闭包问题
      stopTimers();
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
        recordingRef.current = null;
      }
      setState('idle');
      setMeteringLevels([]);
      Alert.alert(
        t('recordingTimeLimitNotice'),
        t('recordingLimitReached', { duration: formatTime(maxDuration) })
      );
    }
  }, [duration, maxDuration, isRecording, stopTimers, t]);

  return {
    isRecording,
    duration,
    formattedDuration,
    meteringLevels,
    hasPermission,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}
