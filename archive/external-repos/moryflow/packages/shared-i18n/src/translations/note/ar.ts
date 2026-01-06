const ar = {
  // 页面基础
  pageTitle: 'الملاحظات',
  pageDescription: 'إدارة ملاحظاتك بميزات الذكاء الاصطناعي',

  // 基础操作
  newNote: 'ملاحظة جديدة',
  deleteNote: 'حذف الملاحظة',
  editNote: 'تحرير الملاحظة',
  saveNote: 'حفظ الملاحظة',
  shareNote: 'مشاركة الملاحظة',
  exportNote: 'تصدير الملاحظة',
  duplicateNote: 'نسخ الملاحظة',
  share: 'مشاركة',
  delete: 'حذف',
  deleteNoteConfirm: 'هل أنت متأكد من حذف هذه الملاحظة؟ لا يمكن التراجع عن هذا الإجراء.',

  // 文件夹管理
  folders: 'المجلدات',
  newFolder: 'مجلد جديد',
  editFolder: 'تحرير المجلد',
  deleteFolder: 'حذف المجلد',
  mergeFolders: 'دمج المجلدات',
  uncategorized: 'غير مصنف',
  folderName: 'اسم المجلد',

  // 笔记列表
  allNotes: 'جميع الملاحظات',
  recentNotes: 'الملاحظات الحديثة',
  noNotes: 'لم يتم العثور على ملاحظات',
  noNotesInFolder: 'لا توجد ملاحظات في هذا المجلد',
  notesCount: '{count} ملاحظة',

  // 搜索和筛选
  searchNotes: 'البحث في الملاحظات',
  searchPlaceholder: 'البحث في الملاحظات...',
  searchResults: 'نتائج البحث',
  clearSearch: 'مسح البحث',
  filterByTag: 'تصفية حسب الوسم',
  filterByType: 'تصفية حسب النوع',
  noSearchResults: 'لم يتم العثور على ملاحظات لـ "{query}"',
  globalSearch: 'البحث العالمي',

  // 编辑器
  untitled: 'بدون عنوان',
  title: 'العنوان',
  content: 'المحتوى',
  addTitle: 'إضافة عنوان...',
  startWriting: 'ابدأ الكتابة...',
  wordCount: '{count} كلمة',

  // 批量操作
  selectAll: 'تحديد الكل',
  deselectAll: 'إلغاء تحديد الكل',
  selectedCount: '{count} محدد',
  batchDelete: 'حذف المحدد',
  batchMove: 'نقل المحدد',
  batchTag: 'وسم المحدد',

  // 音频功能
  recordAudio: 'تسجيل صوتي',
  stopRecording: 'إيقاف التسجيل',
  playAudio: 'تشغيل الصوت',
  pauseAudio: 'إيقاف الصوت مؤقتاً',
  audioNote: 'ملاحظة صوتية',
  transcribing: 'جاري النسخ...',
  transcriptionFailed: 'فشل النسخ',

  // AI功能
  aiSuggestions: 'اقتراحات الذكاء الاصطناعي',
  suggestFolder: 'اقتراح مجلد',
  smartOrganize: 'تنظيم ذكي',
  generateSummary: 'إنشاء ملخص',
  fromChatMessage: 'من رسالة الدردشة',
  fromAudio: 'من الصوت',
  confirmCreation: 'تأكيد الإنشاء',
  previewNote: 'معاينة الملاحظة',

  // 笔记类型
  sourceTypes: {
    manual: 'يدوي',
    chat: 'من الدردشة',
    audio: 'من الصوت',
    file: 'من ملف',
    web: 'من الويب',
  },

  // 时间
  createdAt: 'تم الإنشاء في',
  updatedAt: 'تم التحديث في',
  lastModified: 'آخر تعديل {time}',

  // 确认对话框
  confirmDelete: 'هل أنت متأكد من أنك تريد حذف هذه الملاحظة؟',
  confirmDeleteMultiple: 'هل أنت متأكد من أنك تريد حذف {count} ملاحظة؟',
  confirmDeleteFolder:
    'هل أنت متأكد من أنك تريد حذف هذا المجلد؟ ستنتقل جميع الملاحظات إلى "غير مصنف".',
  unsavedChanges: 'لديك تغييرات غير محفوظة. هل تريد حفظها؟',

  // 错误信息
  saveFailed: 'فشل حفظ الملاحظة',
  loadFailed: 'فشل تحميل الملاحظة',
  deleteFailed: 'فشل حذف الملاحظة',
  exportFailed: 'فشل تصدير الملاحظة',
  folderCreateFailed: 'فشل إنشاء المجلد',
  folderUpdateFailed: 'فشل تحديث المجلد',
  folderDeleteFailed: 'فشل حذف المجلد',
  folderLoadFailed: 'فشل تحميل المجلدات',
  audioRecordFailed: 'فشل التسجيل الصوتي',
  audioUploadFailed: 'فشل رفع الملف الصوتي',

  // 成功消息
  noteSaved: 'تم حفظ الملاحظة بنجاح',
  noteDeleted: 'تم حذف الملاحظة بنجاح',
  notesDeleted: 'تم حذف {count} ملاحظة بنجاح',
  noteExported: 'تم تصدير الملاحظة بنجاح',
  noteShared: 'تم مشاركة الملاحظة بنجاح',
  folderCreated: 'تم إنشاء المجلد بنجاح',
  folderUpdated: 'تم تحديث المجلد بنجاح',
  folderDeleted: 'تم حذف المجلد بنجاح',
  audioRecorded: 'تم التسجيل الصوتي بنجاح',
  noteFromAudio: 'تم إنشاء الملاحظة من الصوت بنجاح',

  // 空状态
  emptyState: {
    title: 'لا توجد ملاحظات بعد',
    description: 'قم بإنشاء ملاحظتك الأولى للبدء',
    actionText: 'إنشاء ملاحظة',
  },

  emptyFolder: {
    title: 'هذا المجلد فارغ',
    description: 'أضف بعض الملاحظات إلى هذا المجلد',
    actionText: 'إضافة ملاحظة',
  },

  emptySearch: {
    title: 'لا توجد ملاحظات مطابقة',
    description: 'حاول تعديل مصطلحات البحث',
    actionText: 'مسح البحث',
  },

  // 键盘快捷键
  shortcuts: {
    newNote: 'Ctrl+N',
    saveNote: 'Ctrl+S',
    search: 'Ctrl+F',
    toggleEdit: 'Ctrl+E',
  },

  // 补充缺失的keys
  createFirstFolder: 'انقر على الزر أعلاه لإنشاء مجلدك الأول',
  noFolders: 'لا توجد مجلدات بعد',
  enterFolderName: 'أدخل اسم المجلد',
  done: 'تم',
  noteCount: '{{count}} ملاحظة',
  createNote: 'إنشاء ملاحظة',
  selectFolder: 'اختر مجلد',
  createFirstNote: 'انقر في الزاوية العلوية اليمنى لإنشاء ملاحظتك الأولى',
  noteNotFound: 'لم يتم العثور على الملاحظة',
  noteDeletedMessage: 'تم حذف الملاحظة',
  noteDetail: 'تفاصيل الملاحظة',
  folderNotFound: 'لم يتم العثور على المجلد',

  // Note detail page
  back: 'رجوع',
  moreActions: 'المزيد من الإجراءات',
  moreFeaturesComing: 'المزيد من الميزات قريباً',
  saving: 'جاري الحفظ...',
  saved: 'تم الحفظ',
  edited: 'تم التحرير',
  createdTime: 'تم الإنشاء',

  // Relative time
  justNow: 'الآن',
  minutesAgo: 'منذ {{count}} دقيقة',
  hoursAgo: 'منذ {{count}} ساعة',
  daysAgo: 'منذ {{count}} يوم',

  // Editor toolbar
  aiAssistant: 'المساعد الذكي',
  insertImage: 'إدراج صورة',
  bold: 'عريض',
  italic: 'مائل',
  underline: 'تحته خط',
  strikethrough: 'يتوسطه خط',
  heading2: 'عنوان 2',
  heading: 'عنوان',
  bulletList: 'قائمة نقطية',
  orderedList: 'قائمة مرقمة',
  task: 'قائمة مهام',
  quote: 'اقتباس',
  code: 'كود',
  inlineCode: 'كود ضمني',
  codeBlock: 'كتلة كود',
  link: 'رابط',
  insertLink: 'إدراج رابط',
  enterLinkUrl: 'أدخل رابط URL',
  dismissKeyboard: 'إخفاء لوحة المفاتيح',
  cancel: 'إلغاء',
  confirm: 'تأكيد',
  boldPlaceholder: 'نص عريض',
  italicPlaceholder: 'نص مائل',
  strikePlaceholder: 'نص يتوسطه خط',
  inlineCodePlaceholder: 'كود',
  linkTextPlaceholder: 'نص الرابط',

  // AI Assistant
  aiInputPlaceholder: 'أدخل طلبك...',
  aiComingSoon: 'ميزات الذكاء الاصطناعي قادمة قريباً',
  aiProcessingError: 'فشلت معالجة الذكاء الاصطناعي',

  // Image related
  needPhotoPermission: 'مطلوب إذن الوصول لمكتبة الصور',
  imageInserted: 'تم إدراج الصورة',
  imagePickerError: 'فشل في اختيار الصورة',

  // Color options
  colorDefault: 'افتراضي',
  colorBlack: 'أسود',
  colorGray: 'رمادي',
  colorRed: 'أحمر',
  colorOrange: 'برتقالي',
  colorYellow: 'أصفر',
  colorGreen: 'أخضر',
  colorBlue: 'أزرق',
  colorPurple: 'بنفسجي',
  colorNone: 'بلا',
  webLink: 'رابط ويب',
  transcriptionFailedMessage: 'فشل في تحويل الصوت إلى نص. حفظ الصوت الأصلي؟',
  duration: 'المدة',
  audioFile: 'ملف صوتي',
} as const

export default ar
