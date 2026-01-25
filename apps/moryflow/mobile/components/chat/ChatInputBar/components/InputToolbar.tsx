/**
 * [PROPS]: voiceState, isLoading, canSend, showFilePanel, mode, onModeChange, models, currentModel, onModelChange, onAtPress, onStartVoice, onStopVoice, onSend, onStop
 * [EMITS]: onAtPress, onStartVoice, onStopVoice, onSend, onStop
 * [POS]: 输入框底部工具栏，包含 @ 按钮、附件、模型选择器、语音、发送
 */

import { useState } from 'react';
import { View, Pressable } from 'react-native';
import { AtSignIcon, ArrowUpIcon, SquareIcon, MicIcon } from '@/components/ui/icons';
import { Icon } from '@/components/ui/icon';
import { useThemeColors } from '@/lib/theme';
import { Text } from '@/components/ui/text';
import { LiveWaveform } from '@/components/ui/live-waveform';
import { useTranslation } from '@/lib/i18n';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AttachmentButton } from './AttachmentButton';
import { ModelSelector } from './ModelSelector';
import { cn } from '@/lib/utils';
import type { VoiceState, ModelOption } from '../const';
import type { AgentAccessMode } from '@anyhunt/agents-runtime';

interface InputToolbarProps {
  voiceState: VoiceState;
  isLoading?: boolean;
  canSend: boolean;
  showFilePanel: boolean;
  mode: AgentAccessMode;
  onModeChange: (mode: AgentAccessMode) => void;
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
  const { t } = useTranslation('chat');
  const [modeConfirmOpen, setModeConfirmOpen] = useState(false);

  const { isVoiceMode, isTranscribing, isRecording, meteringLevels, formattedDuration } =
    voiceState;
  const accessMode = mode ?? 'agent';

  const handleModePress = () => {
    if (accessMode === 'full_access') {
      onModeChange('agent');
      return;
    }
    setModeConfirmOpen(true);
  };

  const confirmFullAccess = () => {
    setModeConfirmOpen(false);
    onModeChange('full_access');
  };

  const renderModeSwitch = () => (
    <Pressable
      className={cn(
        'h-9 items-center justify-center rounded-full px-2.5',
        accessMode === 'full_access' ? 'bg-orange-500/15' : 'bg-muted-foreground/10'
      )}
      onPress={handleModePress}>
      <Text
        className={cn(
          'text-[12px] font-medium',
          accessMode === 'full_access' ? 'text-orange-500' : 'text-muted-foreground'
        )}>
        {accessMode === 'full_access' ? t('fullAccessMode') : t('agentMode')}
      </Text>
    </Pressable>
  );

  // 渲染左侧工具按钮（非语音模式）
  const renderLeftTools = () => (
    <View className="flex-row items-center gap-1">
      {renderModeSwitch()}
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
    <>
      <View className="flex-row items-center justify-between">
        {/* 左侧区域 */}
        {isVoiceMode ? renderVoiceWaveform() : renderLeftTools()}

        {/* 右侧区域 */}
        <View className="flex-row items-center gap-2">
          {renderVoiceButton()}
          {renderSubmitButton()}
        </View>
      </View>
      <AlertDialog open={modeConfirmOpen} onOpenChange={setModeConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('fullAccessConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('fullAccessConfirmDescription')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onPress={confirmFullAccess}>{t('confirmSwitch')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
