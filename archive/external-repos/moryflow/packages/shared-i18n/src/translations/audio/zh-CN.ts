import en from './en'

const zhCN = {
  // 录制状态
  recording: '录制中',
  paused: '已暂停',
  ready: '准备中',

  // 录制操作
  startRecording: '开始录制',
  stopRecording: '停止录制',
  pauseRecording: '暂停录制',
  resumeRecording: '继续录制',

  // 播放控制
  play: '播放',
  pause: '暂停',
  stop: '停止',

  // 状态显示
  duration: '时长：{{time}}',
  recordingTime: '录制中：{{time}}',

  // 错误信息
  recordingFailed: '录制失败',
  playbackFailed: '播放失败',
  permissionDenied: '麦克风权限被拒绝',
  deviceNotAvailable: '录音设备不可用',

  // 成功消息
  recordingCompleted: '录制完成',
  recordingSaved: '录音已保存',

  // UI状态文案
  recStatus: '录制',
  recStatusActive: '录制•',
  pausedStatus: '已暂停',
  maxRecordingTime: '10:00',

  // 权限相关
  permissionRequired: '权限需求',
  microphonePermissionNeeded: '需要麦克风权限才能录音',
  permissionRequestFailed: '无法请求录音权限',

  // 录音限制和提醒
  recordingLimitReached: '已达到{{duration}}录音上限',
  recordingTimeLimitNotice: '提示',

  // 错误信息
  recordingStartError: '无法开始录音，请重试',
  recordingPauseError: '暂停录音失败',
  recordingResumeError: '恢复录音失败',
  recordingStopError: '停止录音失败',
  recordingCancelError: '取消录音时清理失败',
} as const satisfies Record<keyof typeof en, string>

export default zhCN