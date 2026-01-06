import en from './en'

const ar = {
  generic: 'حدث خطأ',
  network: 'خطأ في الشبكة',
  server: 'خطأ في الخادم',
  client: 'خطأ في العميل',
  validation: 'خطأ في التحقق',
  authentication: 'خطأ في المصادقة',
  authorization: 'خطأ في التفويض',
  notFound: 'غير موجود',
  conflict: 'خطأ تعارض',
  rateLimit: 'تم تجاوز حد المعدل',
  maintenance: 'الخدمة تحت الصيانة',
  unknown: 'خطأ غير معروف',
  // إضافات حد خطأ واجهة المستخدم
  appErrorDescription: 'عذراً، واجه التطبيق خطأً غير متوقع. لقد سجلنا هذه المشكلة.',
  devErrorDetails: 'تفاصيل الخطأ (التطوير):',
  viewStackTrace: 'عرض تتبع المكدس',
  viewComponentStack: 'عرض مكدس المكونات',
  resolutionIntro: 'يمكنك تجربة ما يلي لحل هذا:',
  resolutionActionRetry: 'انقر على "إعادة المحاولة" لمتابعة استخدام التطبيق',
  resolutionActionRefresh: 'حدث الصفحة لإعادة تحميل التطبيق',
  resolutionActionGoHome: 'ارجع إلى الصفحة الرئيسية للبدء من جديد',
  resolutionActionContact: 'إذا استمرت المشكلة، يرجى الاتصال بالدعم',

  // أخطاء خدمة OSS
  ossSecretNotConfigured: 'لم يتم توفير EXPO_PUBLIC_OSS_SECRET',
  uploadFailed: 'فشل الرفع',
  transferFailed: 'فشل النقل',
} as const satisfies Record<keyof typeof en, string>

export default ar