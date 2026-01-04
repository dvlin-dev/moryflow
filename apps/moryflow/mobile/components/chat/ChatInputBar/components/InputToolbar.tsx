/**
 * [PROPS]: voiceState, isLoading, canSend, showFilePanel, models, currentModel, onModelChange, onAtPress, onStartVoice, onStopVoice, onSend, onStop
 * [EMITS]: onAtPress, onStartVoice, onStopVoice, onSend, onStop
 * [POS]: 输入框底部工具栏，包含 @ 按钮、附件、模型选择器、语音、发送
 */

import { View, Pressable } from 'react-native'
import { AtSignIcon, ArrowUpIcon, SquareIcon, MicIcon } from 'lucide-react-native'
import { useThemeColors } from '@/lib/theme'
import { Text } from '@/components/ui/text'
import { LiveWaveform } from '@/components/ui/live-waveform'
import { AttachmentButton } from './AttachmentButton'
import { ModelSelector } from './ModelSelector'
import { cn } from '@/lib/utils'
import type { VoiceState, ModelOption } from '../const'

interface InputToolbarProps {
  voiceState: VoiceState
  isLoading?: boolean
  canSend: boolean
  showFilePanel: boolean
  models?: ModelOption[]
  currentModel?: string
  onModelChange?: (modelId: string) => void
  onAtPress: () => void
  onStartVoice: () => void
  onStopVoice: () => void
  onSend: () => void
  onStop?: () => void
  onPhotoLibrary?: () => void
  onCamera?: () => void
  onFileSelect?: () => void
}

export function InputToolbar({
  voiceState,
  isLoading = false,
  canSend,
  showFilePanel,
  models,
  currentModel,
  onModelChange,
  onAtPress,
  onStartVoice,
  onStopVoice,
  onSend,
  onStop,
  onPhotoLibrary,
  onCamera,
  onFileSelect,
}: InputToolbarProps) {
  const colors = useThemeColors()

  const { isVoiceMode, isTranscribing, isRecording, meteringLevels, formattedDuration } =
    voiceState

  // 渲染左侧工具按钮（非语音模式）
  const renderLeftTools = () => (
    <View className="flex-row items-center gap-1">
      {/* @ 按钮 */}
      <Pressable className="w-9 h-9 items-center justify-center" onPress={onAtPress}>
        <AtSignIcon size={20} color={showFilePanel ? colors.info : colors.iconMuted} />
      </Pressable>

      {/* 附件按钮 */}
      <AttachmentButton
        onPhotoLibrary={onPhotoLibrary}
        onCamera={onCamera}
        onFileSelect={onFileSelect}
      />

      {/* 模型选择器 */}
      <ModelSelector
        models={models}
        currentModel={currentModel}
        onModelChange={onModelChange}
      />
    </View>
  )

  // 渲染左侧波形（语音模式）
  const renderVoiceWaveform = () => (
    <View className="flex-1 flex-row items-center gap-2 mr-2">
      <LiveWaveform
        levels={meteringLevels}
        isActive={isRecording}
        barCount={20}
        barWidth={3}
        barGap={2}
        minHeight={4}
        maxHeight={24}
      />
      <Text className="text-[13px] font-mono text-muted-foreground min-w-[50px]">
        {isTranscribing ? '转录中...' : formattedDuration}
      </Text>
    </View>
  )

  // 渲染语音按钮
  const renderVoiceButton = () => {
    if (isVoiceMode) {
      return (
        <Pressable
          className="w-8 h-8 rounded-full items-center justify-center bg-muted-foreground/35"
          onPress={onStopVoice}
          disabled={isTranscribing}
        >
          <SquareIcon size={14} color="#FFFFFF" fill="#FFFFFF" />
        </Pressable>
      )
    }

    if (!isLoading) {
      return (
        <Pressable className="w-8 h-8 items-center justify-center" onPress={onStartVoice}>
          <MicIcon size={20} color={colors.iconMuted} />
        </Pressable>
      )
    }

    return null
  }

  // 渲染发送/停止按钮
  const renderSubmitButton = () => {
    if (isVoiceMode) return null

    if (isLoading) {
      return (
        <Pressable
          className="w-8 h-8 rounded-full items-center justify-center bg-muted-foreground/35"
          onPress={onStop}
        >
          <SquareIcon size={14} color="#FFFFFF" fill="#FFFFFF" />
        </Pressable>
      )
    }

    return (
      <Pressable
        className={cn(
          'w-8 h-8 rounded-full items-center justify-center',
          canSend ? 'bg-info' : 'bg-muted-foreground/25',
        )}
        onPress={onSend}
        disabled={!canSend}
      >
        <ArrowUpIcon size={18} color="#FFFFFF" strokeWidth={2.5} />
      </Pressable>
    )
  }

  return (
    <View className="flex-row items-center justify-between">
      {/* 左侧区域 */}
      {isVoiceMode ? renderVoiceWaveform() : renderLeftTools()}

      {/* 右侧区域 */}
      <View className="flex-row items-center gap-2">
        {renderVoiceButton()}
        {renderSubmitButton()}
      </View>
    </View>
  )
}
