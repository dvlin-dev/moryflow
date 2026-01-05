const en = {
  // 录制状态
  recording: 'Recording',
  paused: 'Paused',
  ready: 'Ready',

  // 录制操作
  startRecording: 'Start Recording',
  stopRecording: 'Stop Recording',
  pauseRecording: 'Pause Recording',
  resumeRecording: 'Resume Recording',

  // 播放控制
  play: 'Play',
  pause: 'Pause',
  stop: 'Stop',

  // 状态显示
  duration: 'Duration: {{time}}',
  recordingTime: 'Recording: {{time}}',

  // 错误信息
  recordingFailed: 'Recording failed',
  playbackFailed: 'Playback failed',
  permissionDenied: 'Microphone permission denied',
  deviceNotAvailable: 'Recording device not available',

  // 成功消息
  recordingCompleted: 'Recording completed',
  recordingSaved: 'Recording saved',

  // UI状态文案
  recStatus: 'REC',
  recStatusActive: 'REC•',
  pausedStatus: 'PAUSED',
  maxRecordingTime: '10:00',

  // 权限相关
  permissionRequired: 'Permission Required',
  microphonePermissionNeeded: 'Microphone permission required to record audio',
  permissionRequestFailed: 'Failed to request audio permission',

  // 录音限制和提醒
  recordingLimitReached: 'Reached {{duration}} recording limit',
  recordingTimeLimitNotice: 'Notice',

  // 错误信息
  recordingStartError: 'Unable to start recording, please try again',
  recordingPauseError: 'Failed to pause recording',
  recordingResumeError: 'Failed to resume recording',
  recordingStopError: 'Failed to stop recording',
  recordingCancelError: 'Failed to clean up during recording cancellation',
} as const

export default en