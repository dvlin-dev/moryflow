/**
 * [PROVIDES]: useVoiceInput - 语音输入 Hook
 * [DEPENDS]: useAudioRecorder, transcribeAudio
 * [POS]: 封装语音录制和转录逻辑
 */

import { useState, useCallback } from 'react'
import { Alert } from 'react-native'
import { useAudioRecorder } from '@/lib/hooks/use-audio-recorder'
import { transcribeAudio, SpeechError } from '@/lib/utils/speech-helper'

interface UseVoiceInputOptions {
  /** 当前输入框内容 */
  input: string
  /** 输入框内容变更回调 */
  onInputChange: (text: string) => void
}

interface UseVoiceInputReturn {
  /** 是否处于语音模式 */
  isVoiceMode: boolean
  /** 是否正在转录 */
  isTranscribing: boolean
  /** 是否正在录音 */
  isRecording: boolean
  /** 音频电平数据 */
  meteringLevels: number[]
  /** 格式化的录音时长 */
  formattedDuration: string
  /** 开始语音录制 */
  startVoice: () => Promise<void>
  /** 停止语音录制并转录 */
  stopVoice: () => Promise<void>
}

export function useVoiceInput({
  input,
  onInputChange,
}: UseVoiceInputOptions): UseVoiceInputReturn {
  const [isVoiceMode, setIsVoiceMode] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)

  const {
    isRecording,
    meteringLevels,
    formattedDuration,
    startRecording,
    stopRecording,
  } = useAudioRecorder()

  // 开始语音录制
  const startVoice = useCallback(async () => {
    setIsVoiceMode(true)
    await startRecording()
  }, [startRecording])

  // 停止语音录制并转录
  const stopVoice = useCallback(async () => {
    const uri = await stopRecording()
    if (!uri) {
      setIsVoiceMode(false)
      return
    }

    setIsTranscribing(true)
    try {
      const text = await transcribeAudio(uri)
      // 追加到输入框
      const newInput = input + (input.trim() ? ' ' : '') + text
      onInputChange(newInput)
    } catch (error) {
      const message =
        error instanceof SpeechError ? error.message : '转录失败，请重试'
      Alert.alert('语音转录失败', message)
    } finally {
      setIsTranscribing(false)
      setIsVoiceMode(false)
    }
  }, [stopRecording, input, onInputChange])

  return {
    isVoiceMode,
    isTranscribing,
    isRecording,
    meteringLevels,
    formattedDuration,
    startVoice,
    stopVoice,
  }
}
