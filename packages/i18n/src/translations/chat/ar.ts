import en from './en';

const ar = {
  newConversation: 'محادثة جديدة',
  deleteConversation: 'حذف المحادثة',
  clearHistory: 'مسح السجل',
  sendMessage: 'إرسال رسالة',
  regenerate: 'إعادة إنشاء',
  copy: 'نسخ',
  copySuccess: 'تم النسخ إلى الحافظة',
  typing: 'يكتب...',
  thinking: 'يفكر...',
  messagePlaceholder: 'اكتب رسالتك...',
  attachFile: 'إرفاق ملف',
  referenceNote: 'مرجع ملاحظة',
  history: 'السجل',
  noHistory: 'لا يوجد سجل محادثات',
  // رسائل الخطأ
  sendFailed: 'فشل إرسال الرسالة',
  networkError: 'خطأ في الشبكة، يرجى التحقق من اتصالك',
  serverError: 'خطأ في الخادم، يرجى المحاولة مرة أخرى لاحقاً',
  quotaExceeded: 'تم تجاوز الحصة المسموحة',
  // رسائل النجاح
  conversationDeleted: 'تم حذف المحادثة',
  conversationRenamed: 'تم إعادة تسمية المحادثة',
  historyCleared: 'تم مسح السجل',
  messageDeleted: 'تم حذف الرسالة',
  renameFailed: 'فشلت إعادة التسمية، يرجى المحاولة مرة أخرى',
  deleteFailed: 'فشل الحذف، يرجى المحاولة مرة أخرى',
  // الواجهة والحوارات
  renameConversationTitle: 'إعادة تسمية المحادثة',
  deleteConfirmTitle: 'تأكيد الحذف',
  deleteConfirmDescription:
    'هذا الإجراء لا يمكن التراجع عنه. هل أنت متأكد من أنك تريد حذف هذه المحادثة؟',
  deleteConfirmWithTitle:
    'هل أنت متأكد من أنك تريد حذف المحادثة "{{title}}"؟ هذا الإجراء لا يمكن التراجع عنه.',
  titleLabel: 'العنوان',
  newTitlePlaceholder: 'أدخل عنوان المحادثة الجديد',
  // حدود الخطأ
  chatErrorTitle: 'واجهت المحادثة مشكلة',
  chatErrorDescription: 'عذراً، واجه مكون المحادثة خطأ. يمكنك تجربة الإجراءات التالية للاستعادة.',
  reloadChat: 'إعادة تحميل المحادثة',
  backToChatList: 'العودة إلى قائمة المحادثات',
  chatSeoDescription: 'محادثة مع المساعد الذكي',

  // المفاتيح المكملة المفقودة
  voiceTranscriptionFailed: 'فشل النقل الصوتي',
  voiceTranscriptionError: 'فشل النقل الصوتي، يرجى المحاولة مرة أخرى',
  conversation: 'محادثة',
  askAnything: 'اسأل أي شيء',
  speak: 'تحدث',
  search: 'بحث',
  tasks: 'المهام',
  companions: 'المساعدين',
  conversations: 'المحادثات',
  // Empty states
  emptyNewConversation: 'بدء محادثة جديدة',
  noMessages: 'لا توجد رسائل بعد',

  // لوحة الدردشة PC
  waitingForYou: 'أنا هنا في انتظارك',
  startChatPrompt: 'شارك أفكارك، سواء كان تنظيم الملاحظات أو العصف الذهني',
  writeMessage: 'Write something... Use @ to reference files',
  addFile: 'Add File',
  addContext: 'Add Context',
  searchDocs: 'Search documents...',
  openPlusMenu: 'Open actions',
  uploadFiles: 'Upload files',
  accessModeDefaultPermission: 'الإذن الافتراضي',
  accessModeFullAccess: 'وصول كامل',
  referenceFiles: 'Reference files',
  mcpMenu: 'MCP',
  switchModel: 'تبديل النموذج',
  configureModel: 'تكوين النموذج',
  stopGenerating: 'إيقاف التوليد',
  removeReference: 'إزالة المرجع',
  removeFile: 'Remove file',
  usedContext: '{{percent}}% {{used}} / {{total}} سياق مستخدم',
  searchCommands: 'البحث في الأوامر أو إدخال كلمة...',
  preparing: 'جارٍ التحضير...',
  writeFailed: 'فشل الكتابة',

  // رأس لوحة الدردشة
  expand: 'توسيع',
  collapse: 'طي',
  deleteChat: 'حذف الدردشة',

  // إضافات إدخال دردشة PC
  setupModelFirst: 'يرجى إعداد نموذج AI أولاً',
  waitMoment: 'جارٍ التحضير، يرجى الانتظار',
  maxRecordingReached: 'تم الوصول إلى الحد الأقصى لمدة التسجيل، توقف تلقائياً',
  startRecording: 'بدء التسجيل',
  stopRecording: 'إيقاف التسجيل',
  noModelFound: 'لم يتم العثور على نماذج',
  modelSettings: 'إعدادات النموذج',
  selectModel: 'اختر النموذج',
  setupModel: 'إعداد النموذج',
  transcribing: 'Transcribing...',
  openedDocs: 'Opened Documents',
  recentFiles: 'Recent',
  allFiles: 'All files',
  noRecentFiles: 'No recent files',
  noMcpServers: 'No MCP Servers',
  notFound: 'Not found',
  allDocsAdded: 'All files have been added',
  noOpenDocs: 'No files in workspace',
  upgrade: 'ترقية',
  updateModeFailed: 'Failed to update mode',

  // Access mode
  agentMode: 'Agent',
  fullAccessMode: 'Full Access',
  fullAccessConfirmTitle: 'Switch to full access?',
  fullAccessConfirmDescription:
    'Full access auto-approves risky actions and bypasses permission prompts for this session.',
  confirmSwitch: 'Switch',
  cancel: 'Cancel',

  // Todo panel
  tasksCompleted: '{{completed}} من {{total}} مهام مكتملة',
  taskPanelIdle: 'خامل',
  taskPanelAllCompleted: 'اكتملت جميع المهام',
  taskPanelShowMore: 'عرض المزيد',
  taskPanelShowLess: 'عرض أقل',
  taskPanelLoadFailed: 'فشل تحميل المهام',

  // Message
  thinkingText: 'يفكر...',

  // ========== AI Elements ==========
  // حالة الأداة
  statusPreparing: 'جارٍ التحضير',
  statusExecuting: 'جارٍ التنفيذ',
  statusWaitingConfirmation: 'في انتظار التأكيد',
  statusConfirmed: 'تم التأكيد',
  statusCompleted: 'مكتمل',
  statusError: 'خطأ',
  statusSkipped: 'تم التخطي',

  // Tool approval
  approvalRequired: 'Approval required',
  approvalRequestHint: 'Approve this tool call to continue.',
  approvalGranted: 'Approval granted',
  approveOnce: 'Approve once',
  approveAlways: 'Always allow',
  approvalFailed: 'Failed to approve tool',

  // تسميات الأداة
  parameters: 'المعلمات',
  errorLabel: 'خطأ',
  resultLabel: 'النتيجة',

  // إجراءات الأداة
  fileWritten: 'تم كتابة الملف',
  targetFile: 'الملف الهدف',
  contentTooLong: 'المحتوى طويل جداً، تم اقتطاعه. شاهد النسخة الكاملة في الملف المحلي.',
  outputTruncated: 'Output truncated',
  viewFullOutput: 'View full output',
  fullOutputPath: 'Full output path',
  fullOutputTitle: 'Full output',
  written: 'تم الكتابة',
  applyToFile: 'تطبيق على الملف',
  noTasks: 'لا توجد مهام',
  openFileFailed: 'Failed to open file',

  // المرفقات
  contextInjected: 'تم الحقن',
  collapseInjection: 'طي المحتوى المحقون',
  viewInjection: 'عرض المحتوى المحقون',
  contentTruncated: 'المحتوى طويل جداً، تم اقتطاع المرفق',

  // محدد MCP
  mcpServers: 'خوادم MCP',
  reconnectAllServers: 'إعادة الاتصال بجميع الخوادم',
  toolCount: '{{count}} أدوات',
  connecting: 'جارٍ الاتصال...',
  notConnected: 'غير متصل',
  manageServer: 'إدارة هذا الخادم',
  addMcpServer: 'إضافة خادم MCP',
} as const satisfies Record<keyof typeof en, string>;

export default ar;
