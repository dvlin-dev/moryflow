import en from './en'

const ar = {
  // حالة التسجيل
  recording: 'جاري التسجيل',
  paused: 'متوقف مؤقتاً',
  ready: 'جاهز',

  // عمليات التسجيل
  startRecording: 'بدء التسجيل',
  stopRecording: 'إيقاف التسجيل',
  pauseRecording: 'إيقاف التسجيل مؤقتاً',
  resumeRecording: 'استئناف التسجيل',

  // عناصر التحكم في التشغيل
  play: 'تشغيل',
  pause: 'إيقاف مؤقت',
  stop: 'إيقاف',

  // عرض الحالة
  duration: 'المدة: {{time}}',
  recordingTime: 'وقت التسجيل: {{time}}',

  // رسائل الخطأ
  recordingFailed: 'فشل التسجيل',
  playbackFailed: 'فشل التشغيل',
  permissionDenied: 'تم رفض إذن الميكروفون',
  deviceNotAvailable: 'جهاز التسجيل غير متوفر',

  // رسائل النجاح
  recordingCompleted: 'اكتمل التسجيل',
  recordingSaved: 'تم حفظ التسجيل',

  // نص حالة واجهة المستخدم
  recStatus: 'تسجيل',
  recStatusActive: 'تسجيل•',
  pausedStatus: 'متوقف مؤقتاً',
  maxRecordingTime: '10:00',

  // الأذونات
  permissionRequired: 'يتطلب إذن',
  microphonePermissionNeeded: 'يتطلب إذن الميكروفون لتسجيل الصوت',
  permissionRequestFailed: 'فشل في طلب إذن الصوت',

  // حدود التسجيل والإشعارات
  recordingLimitReached: 'تم الوصول إلى حد {{duration}} للتسجيل',
  recordingTimeLimitNotice: 'إشعار',

  // رسائل الخطأ
  recordingStartError: 'غير قادر على بدء التسجيل، يرجى المحاولة مرة أخرى',
  recordingPauseError: 'فشل في إيقاف التسجيل مؤقتاً',
  recordingResumeError: 'فشل في استئناف التسجيل',
  recordingStopError: 'فشل في إيقاف التسجيل',
  recordingCancelError: 'فشل في التنظيف أثناء إلغاء التسجيل',
} as const satisfies Record<keyof typeof en, string>

export default ar