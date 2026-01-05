import en from './en'

const ar = {
  online: 'متصل',
  offline: 'غير متصل',
  away: 'غائب',
  busy: 'مشغول',
  available: 'متاح',
  connecting: 'جاري الاتصال...',
  disconnected: 'منقطع',
  error: 'خطأ',
  loading: 'جاري التحميل',
  syncing: 'جاري المزامنة',
  uploading: 'جاري الرفع',
  downloading: 'جاري التحميل',
  processing: 'جاري المعالجة',
} as const satisfies Record<keyof typeof en, string>

export default ar