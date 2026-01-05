import en from './en'

const ar = {
  required: 'هذا الحقل مطلوب',
  email: 'يرجى إدخال عنوان بريد إلكتروني صالح',
  url: 'يرجى إدخال رابط صالح',
  number: 'يرجى إدخال رقم صالح',
  integer: 'يرجى إدخال عدد صحيح صالح',
  min: 'القيمة يجب أن تكون على الأقل {{min}}',
  max: 'القيمة يجب أن تكون على الأكثر {{max}}',
  minLength: 'يجب أن يكون على الأقل {{min}} أحرف',
  maxLength: 'يجب أن يكون على الأكثر {{max}} أحرف',
  pattern: 'تنسيق غير صالح',
  unique: 'هذه القيمة موجودة بالفعل',
  confirmed: 'القيم غير متطابقة',

  // المفاتيح المكملة المفقودة
  emailRequired: 'البريد الإلكتروني مطلوب',
  emailInvalid: 'يرجى إدخال عنوان بريد إلكتروني صالح',
  passwordMinLength: 'كلمة المرور يجب أن تكون على الأقل {{min}} أحرف',
  passwordMismatch: 'كلمات المرور غير متطابقة',
  usernameMinLengthError: 'اسم المستخدم يجب أن يكون على الأقل {{min}} أحرف (حالياً {{current}})',

  // ========== التحقق من MCP/Provider ==========
  enterName: 'يرجى إدخال الاسم',
  enterCommand: 'يرجى إدخال الأمر',
  invalidUrlFormat: 'تنسيق URL غير صالح',
  emailMismatch: 'البريد الإلكتروني غير متطابق',
} as const satisfies Record<keyof typeof en, string>

export default ar