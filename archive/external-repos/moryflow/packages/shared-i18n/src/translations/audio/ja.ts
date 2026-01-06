import en from './en'

const ja = {
  // 録音状態
  recording: '録音中',
  paused: '一時停止',
  ready: '準備完了',

  // 録音操作
  startRecording: '録音開始',
  stopRecording: '録音停止',
  pauseRecording: '録音を一時停止',
  resumeRecording: '録音を再開',

  // 再生コントロール
  play: '再生',
  pause: '一時停止',
  stop: '停止',

  // 状態表示
  duration: '時間: {{time}}',
  recordingTime: '録音時間: {{time}}',

  // エラーメッセージ
  recordingFailed: '録音に失敗しました',
  playbackFailed: '再生に失敗しました',
  permissionDenied: 'マイクの許可が拒否されました',
  deviceNotAvailable: '録音デバイスが利用できません',

  // 成功メッセージ
  recordingCompleted: '録音が完了しました',
  recordingSaved: '録音を保存しました',

  // UI状態テキスト
  recStatus: '録音',
  recStatusActive: '録音•',
  pausedStatus: '一時停止',
  maxRecordingTime: '10:00',

  // 権限関連
  permissionRequired: '権限が必要です',
  microphonePermissionNeeded: '音声録音にはマイクの権限が必要です',
  permissionRequestFailed: '音声権限のリクエストに失敗しました',

  // 録音制限と通知
  recordingLimitReached: '{{duration}}の録音制限に達しました',
  recordingTimeLimitNotice: 'お知らせ',

  // エラーメッセージ
  recordingStartError: '録音を開始できません。もう一度お試しください',
  recordingPauseError: '録音の一時停止に失敗しました',
  recordingResumeError: '録音の再開に失敗しました',
  recordingStopError: '録音の停止に失敗しました',
  recordingCancelError: '録音キャンセル時のクリーンアップに失敗しました',
} as const satisfies Record<keyof typeof en, string>

export default ja