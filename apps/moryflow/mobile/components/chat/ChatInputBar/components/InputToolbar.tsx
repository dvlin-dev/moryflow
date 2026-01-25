/**
 * [PROPS]: voiceState, isLoading, canSend, showFilePanel, models, currentModel, onModelChange, onAtPress, onStartVoice, onStopVoice, onSend, onStop
 * [EMITS]: onAtPress, onStartVoice, onStopVoice, onSend, onStop
 * [POS]: 输入框底部工具栏，包含 @ 按钮、附件、模型选择器、语音、发送
 */

import { View, Pressable } from 'react-native';
import { AtSignIcon, ArrowUpIcon, SquareIcon, MicIcon } from '@/components/ui/icons';
import { Icon } from '@/components/ui/icon';
import { useThemeColors } from '@/lib/theme';
import { Text } from '@/components/ui/text';
import { LiveWaveform } from '@/components/ui/live-waveform';
import { AttachmentButton } from './AttachmentButton';
import { ModelSelector } from './ModelSelector';
import { cn } from '@/lib/utils';
import type { VoiceState, ModelOption } from '../const';

interface InputToolbarProps {
  voiceState: VoiceState;
  isLoading?: boolean;
  canSend: boolean;
  showFilePanel: boolean;
  models?: ModelOption[];
  currentModel?: string;
  onModelChange?: (modelId: string) => void;
  onAtPress: () => void;
  onStartVoice: () => void;
  onStopVoice: () => void;
  onSend: () => void;
  onStop?: () => void;
  onPhotoLibrary?: () => void;
  onCamera?: () => void;
  onFileSelect?: () => void;
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
  const colors = useThemeColors();

  const { isVoiceMode, isTranscribing, isRecording, meteringLevels, formattedDuration } =
    voiceState;

  // 渲染左侧工具按钮（非语音模式）
  const renderLeftTools = () => (
    <View className="flex-row items-center gap-1">
      {/* @ 按钮 */}
      <Pressable className="h-9 w-9 items-center justify-center" onPress={onAtPress}>
        <Icon as={AtSignIcon} size={20} color={showFilePanel ? colors.info : colors.iconMuted} />
      </Pressable>

      {/* 附件按钮 */}
      <AttachmentButton
        onPhotoLibrary={onPhotoLibrary}
        onCamera={onCamera}
        onFileSelect={onFileSelect}
      />

      {/* 模型选择器 */}
      <ModelSelector models={models} currentModel={currentModel} onModelChange={onModelChange} />
    </View>
  );

  // 渲染左侧波形（语音模式）
  const renderVoiceWaveform = () => (
    <View className="mr-2 flex-1 flex-row items-center gap-2">
      <LiveWaveform
        levels={meteringLevels}
        isActive={isRecording}
        barCount={20}
        barWidth={3}
        barGap={2}
        minHeight={4}
        maxHeight={24}
      />
      <Text className="text-muted-foreground min-w-[50px] font-mono text-[13px]">
        {isTranscribing ? '转录中...' : formattedDuration}
      </Text>
    </View>
  );

  // 渲染语音按钮
  const renderVoiceButton = () => {
    if (isVoiceMode) {
      return (
        <Pressable
          className="bg-muted-foreground/35 h-8 w-8 items-center justify-center rounded-full"
          onPress={onStopVoice}
          disabled={isTranscribing}>
          <Icon as={SquareIcon} size={14} color="#FFFFFF" fill="#FFFFFF" />
        </Pressable>
      );
    }

    if (!isLoading) {
      return (
        <Pressable className="h-8 w-8 items-center justify-center" onPress={onStartVoice}>
          <Icon as={MicIcon} size={20} color={colors.iconMuted} />
        </Pressable>
      );
    }

    return null;
  };

  // 渲染发送/停止按钮
  const renderSubmitButton = () => {
    if (isVoiceMode) return null;

    if (isLoading) {
      return (
        <Pressable
          className="bg-muted-foreground/35 h-8 w-8 items-center justify-center rounded-full"
          onPress={onStop}>
          <Icon as={SquareIcon} size={14} color="#FFFFFF" fill="#FFFFFF" />
        </Pressable>
      );
    }

    return (
      <Pressable
        className={cn(
          'h-8 w-8 items-center justify-center rounded-full',
          canSend ? 'bg-info' : 'bg-muted-foreground/25'
        )}
        onPress={onSend}
        disabled={!canSend}>
        <Icon as={ArrowUpIcon} size={18} color="#FFFFFF" strokeWidth={2.5} />
      </Pressable>
    );
  };

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
  );
}
