import en from './en'

const ar = {
  profile: 'الملف الشخصي',
  settings: 'الإعدادات',
  account: 'الحساب',
  preferences: 'التفضيلات',
  notifications: 'الإشعارات',
  privacy: 'الخصوصية',
  security: 'الأمان',
  language: 'اللغة',
  theme: 'المظهر',
  name: 'الاسم',
  bio: 'السيرة الذاتية',
  changePassword: 'تغيير كلمة المرور',
  twoFactorAuth: 'المصادقة الثنائية',
  deleteAccount: 'حذف الحساب',
  exportData: 'تصدير البيانات',
  // رسائل الخطأ
  updateFailed: 'فشل تحديث الملف الشخصي',
  uploadFailed: 'فشل رفع الملف',
  deleteFailed: 'فشل حذف الحساب',
  usernameRequired: 'اسم المستخدم لا يمكن أن يكون فارغاً',
  usernameTooShort: 'اسم المستخدم يجب أن يكون على الأقل 3 أحرف',
  usernameTooLong: 'اسم المستخدم لا يمكن أن يتجاوز 20 حرفاً',
  usernameInvalidFormat: 'اسم المستخدم يمكن أن يحتوي فقط على أحرف وأرقام وعلامة الشرطة السفلية والواصلة',
  currentPasswordRequired: 'يرجى إدخال كلمة المرور الحالية',
  newPasswordRequired: 'يرجى إدخال كلمة مرور جديدة',
  confirmPasswordRequired: 'يرجى تأكيد كلمة المرور الجديدة',
  passwordTooShort: 'كلمة المرور يجب أن تكون على الأقل 6 أحرف',
  passwordMismatch: 'كلمات المرور غير متطابقة',
  verificationCodeRequired: 'يرجى إدخال رمز التحقق',
  verificationCodeInvalidLength: 'رمز التحقق يجب أن يكون 6 أرقام',
  verificationCodeSendFailed: 'فشل إرسال رمز التحقق، يرجى المحاولة مرة أخرى',
  passwordChangeFailed: 'فشل تغيير كلمة المرور، يرجى المحاولة مرة أخرى',
  emailUnavailable: 'عنوان البريد الإلكتروني غير متاح',
  emailInvalid: 'يرجى إدخال عنوان بريد إلكتروني صالح',
  // رسائل النجاح
  profileUpdated: 'تم تحديث الملف الشخصي بنجاح',
  passwordChanged: 'تم تغيير كلمة المرور بنجاح',
  accountDeleted: 'تم حذف الحساب بنجاح',
  dataExported: 'تم تصدير البيانات بنجاح',
  // محتوى جديد متعلق بالمستخدم على الجوال
  defaultUsername: 'مستخدم',
  noEmail: 'لا يوجد بريد إلكتروني',

  // المفاتيح المكملة المفقودة
  usernameInputPlaceholder: 'أدخل اسم المستخدم ({{min}}-{{max}} أحرف)',
  usernameMinLengthError: 'اسم المستخدم يجب أن يكون على الأقل {{min}} أحرف (حالياً {{current}})',
  usernameFormatHint: 'يدعم الأحرف والأرقام وعلامة الشرطة السفلية والواصلة',
  emailNotEditable: 'لا يمكن تعديل عنوان البريد الإلكتروني',
  username: 'اسم المستخدم',
} as const satisfies Record<keyof typeof en, string>

export default ar