import en from './en';

const ar = {
  // العناوين والقوائم
  settings: 'الإعدادات',
  cancel: 'إلغاء',
  saveSettings: 'حفظ الإعدادات',
  loading: 'جاري التحميل...',
  general: 'عام',
  appearance: 'المظهر',
  notifications: 'الإشعارات',
  privacy: 'الخصوصية',
  security: 'الأمان',
  advanced: 'متقدم',
  about: 'حول',
  version: 'الإصدار',
  checkUpdate: 'التحقق من التحديثات',
  reportBug: 'الإبلاغ عن خطأ',
  feedback: 'الملاحظات',
  profile: 'الملف الشخصي',
  preferences: 'التفضيلات',

  // عناوين الصفحات والأوصاف
  profileDescription: 'إدارة معلوماتك الشخصية',
  securityDescription: 'تغيير كلمة المرور لتأمين حسابك',
  preferencesDescription: 'تخصيص تجربتك',
  verifyEmailTitle: 'تحقق من البريد الإلكتروني',
  verifyEmailDescription: 'أدخل رمز التحقق المرسل إلى {email}',

  // الملف الشخصي
  username: 'اسم المستخدم',
  email: 'البريد الإلكتروني',
  emailCannotModify: 'لا يمكن تعديل عنوان البريد الإلكتروني',
  usernameSupports: 'يدعم الأحرف والأرقام وعلامة الشرطة السفلية والواصلة',

  // خيارات المظهر
  theme: 'المظهر',
  themeDescription: 'اختر مظهر الواجهة المفضل لديك',
  light: 'فاتح',
  lightDescription: 'واجهة مشرقة، مناسبة للاستخدام النهاري',
  dark: 'داكن',
  darkDescription: 'واجهة داكنة مريحة للعين، مناسبة للاستخدام الليلي',
  system: 'اتبع النظام',
  systemDescription: 'تبديل تلقائي، يتبع إعدادات النظام',

  // خيارات اللغة
  language: 'اللغة',
  languageDescription: 'اختر لغة عرض الواجهة',
  english: 'الإنجليزية',
  simplifiedChinese: 'الصينية المبسطة',
  languageFeatureInDevelopment: 'ملاحظة: ميزة تبديل اللغة قيد التطوير، قادمة قريباً',
  selectLanguage: 'اختيار اللغة',
  selectLanguageMessage: 'اختر اللغة المفضلة لديك',
  languageChangeNote: 'ستتغير لغة الواجهة فوراً بعد الاختيار',

  // إعدادات الأمان
  currentPassword: 'كلمة المرور الحالية',
  newPassword: 'كلمة المرور الجديدة',
  confirmPassword: 'تأكيد كلمة المرور الجديدة',
  verificationCode: 'رمز التحقق',
  sendVerificationCode: 'إرسال رمز التحقق',
  sendCode: 'إرسال الرمز',
  resendCode: 'إعادة الإرسال',
  resendTimer: 'إعادة الإرسال ({seconds}ث)',
  backToModify: 'العودة للتعديل',
  confirmModify: 'تأكيد التعديل',
  enterNewEmail: 'أدخل البريد الإلكتروني الجديد',

  // قوة كلمة المرور
  passwordStrengthWeak: 'ضعيفة',
  passwordStrengthMedium: 'متوسطة',
  passwordStrengthStrong: 'قوية',
  passwordStrengthVeryStrong: 'قوية جداً',

  // أزرار العمليات
  save: 'حفظ',
  saveChanges: 'حفظ التغييرات',
  saving: 'جاري الحفظ...',
  applyChanges: 'تطبيق التغييرات',

  // قواعد وإرشادات كلمة المرور
  passwordMinLength: 'كلمة المرور يجب أن تكون على الأقل {length} أحرف',
  passwordStrengthTips:
    '• طول كلمة المرور على الأقل 6 أحرف\n• يُنصح بتضمين أحرف وأرقام ورموز خاصة\n• الخطوة التالية ستُرسل رمز التحقق إلى بريدك الإلكتروني',
  verificationTips:
    '• رمز التحقق صالح لمدة 10 دقائق\n• إذا لم تستلم الرمز، تحقق من مجلد الرسائل غير المرغوب فيها\n• ستحتاج لتسجيل الدخول مجدداً بعد تغيير كلمة المرور',

  // التحقق من اسم المستخدم
  usernameMinLength: 'اسم المستخدم يجب أن يكون على الأقل {min} أحرف (حالياً {current})',
  usernameOnlyAllowedChars:
    'اسم المستخدم يمكن أن يحتوي فقط على أحرف وأرقام وعلامة الشرطة السفلية والواصلة',
  usernamePlaceholder: 'أدخل اسم المستخدم ({min}-{max} أحرف)',

  // إرشادات إدخال كلمة المرور
  enterCurrentPassword: 'يرجى إدخال كلمة المرور الحالية',
  enterNewPassword: 'يرجى إدخال كلمة مرور جديدة (على الأقل 6 أحرف)',
  confirmNewPassword: 'يرجى إدخال كلمة المرور الجديدة مرة أخرى',
  enterVerificationCode: 'يرجى إدخال رمز التحقق المكون من 6 أرقام',

  // رسائل النجاح والخطأ
  profileUpdateSuccess: 'تم تحديث الملف الشخصي بنجاح',
  passwordChangeSuccess: 'تم تغيير كلمة المرور بنجاح، يرجى تسجيل الدخول مرة أخرى',
  verificationCodeSent: 'تم إرسال رمز التحقق إلى {email}',
  verificationCodeResent: 'تم إعادة إرسال رمز التحقق',

  // رسائل الخطأ موجودة في userTranslations و validationTranslations

  // عناصر الإعدادات الجديدة للجوال
  changePassword: 'تغيير كلمة المرور',
  dataManagement: 'إدارة البيانات',

  // المفاتيح المكملة المفقودة
  selectThemeMode: 'اختر وضع المظهر',
  systemMode: 'وضع النظام',
  lightMode: 'الوضع الفاتح',
  darkMode: 'الوضع الداكن',
  databaseInfo: 'معلومات قاعدة البيانات',
  storageType: 'نوع التخزين',
  databaseSize: 'حجم قاعدة البيانات',
  bufferZone: 'المنطقة الاحتياطية',
  pendingWrites: '{{count}} عمليات كتابة معلقة',
  backToEdit: 'العودة للتحرير',
  confirmChanges: 'تأكيد التغييرات',
  verificationCodeHints:
    '• رمز التحقق صالح لمدة 10 دقائق\n• إذا لم تستلم الرمز، تحقق من مجلد الرسائل غير المرغوب فيها\n• ستحتاج لتسجيل الدخول مجدداً بعد تغيير كلمة المرور',
  passwordHints:
    '• طول كلمة المرور على الأقل 6 أحرف\n• يُنصح بتضمين أحرف وأرقام ورموز خاصة\n• الخطوة التالية ستُرسل رمز التحقق إلى بريدك الإلكتروني',
  status: 'الحالة',

  // حذف الحساب
  deleteAccount: 'حذف الحساب',
  deleteAccountTitle: 'حذف الحساب',
  deleteAccountWarning:
    'بعد حذف حسابك، سيتم مسح جميع بياناتك نهائياً. لا يمكن التراجع عن هذا الإجراء.',
  selectDeleteReason: 'يرجى اختيار سبب حذف حسابك',
  deleteReasonNotUseful: 'لم أعد بحاجة إلى هذا المنتج',
  deleteReasonFoundAlternative: 'وجدت بديلاً أفضل',
  deleteReasonTooExpensive: 'السعر مرتفع جداً',
  deleteReasonTooComplex: 'الاستخدام معقد جداً',
  deleteReasonBugsIssues: 'كثرة الأخطاء والمشاكل',
  deleteReasonOther: 'سبب آخر',
  deleteFeedbackPlaceholder: 'أخبرنا المزيد (اختياري، 500 حرف كحد أقصى)',
  deleteConfirmationHint: 'يرجى إدخال بريدك الإلكتروني للتأكيد',
  confirmDeleteAccount: 'تأكيد حذف الحساب',
  deleting: 'جاري الحذف...',
  deleteAccountSuccess: 'تم حذف الحساب بنجاح',
  deleteAccountError: 'فشل حذف الحساب',

  // إعادة تعيين إعدادات PC
  resetSettings: 'إعادة تعيين الإعدادات',
  resetSettingsDescription:
    'مسح جميع بيانات التكوين والعودة إلى الحالة الأولية. لن تتأثر ملفات Vault. يتطلب إعادة التشغيل.',
  resetSettingsConfirm:
    'هل أنت متأكد من إعادة تعيين الإعدادات؟\n\nسيتم حذف جميع بيانات التكوين (لن تتأثر ملفات Vault). ستصبح التغييرات فعالة بعد إعادة التشغيل.',
  resetSettingsSuccess: 'تمت إعادة التعيين، يرجى إعادة تشغيل التطبيق',
  resetSettingsFailed: 'فشلت إعادة التعيين، يرجى المحاولة لاحقاً',
  resetSettingsNotSupported: 'هذه العملية غير مدعومة في البيئة الحالية',
  resetButton: 'إعادة تعيين',

  // أوصاف وضع المظهر
  lightModeDescription: 'مناسب للبيئات المضيئة',
  darkModeDescription: 'مثالي لليل أو الإضاءة الخافتة',
  systemModeDescription: 'مزامنة تلقائية مع نظام التشغيل',

  // ========== التنقل في إعدادات PC ==========
  account: 'الحساب',
  accountDescription: 'تسجيل الدخول والعضوية',
  generalDescription: 'المظهر والتفضيلات',
  systemPrompt: 'نص النظام',
  systemPromptDescription: 'الموجه والمعلمات',
  providers: 'مزودو الذكاء الاصطناعي',
  providersDescription: 'مفاتيح API والنماذج',
  mcp: 'MCP',
  mcpDescription: 'إضافات الأدوات',
  cloudSync: 'المزامنة السحابية',
  cloudSyncDescription: 'مزامنة متعددة الأجهزة',
  aboutDescription: 'معلومات الإصدار',

  // ========== إعدادات النموذج ==========
  defaultModelLabel: 'النموذج الافتراضي (اختياري)',
  defaultModelFormatHint:
    'التنسيق: معرف_المزود/معرف_النموذج. إذا تُرك فارغًا، سيتم استخدام النموذج الافتراضي للمزود الأول المفعّل.',
  defaultModelConfigDescription:
    'يرجى تكوين المزودين والنماذج في صفحة "مزودو الذكاء الاصطناعي"، ثم قم بتعيين النموذج الافتراضي العام هنا.',

  // ========== System Prompt ==========
  systemPromptModeLabel: 'الوضع',
  systemPromptModeHint: 'الوضع الافتراضي يُخفي الموجه والمعلمات.',
  systemPromptModeDefault: 'استخدام الافتراضي',
  systemPromptModeCustom: 'مخصص',
  systemPromptDefaultHint: 'يتم استخدام الموجه المدمج وإعدادات النموذج الافتراضية.',
  systemPromptTemplateLabel: 'نص النظام',
  systemPromptTemplatePlaceholder: 'أدخل نص النظام...',
  systemPromptTemplateHint: 'الموجه المخصص يستبدل الافتراضي.',
  systemPromptResetTemplate: 'إعادة ضبط القالب الافتراضي',
  systemPromptAdvancedLabel: 'متقدم (اختياري)',
  systemPromptAdvancedHint: 'استخدمه فقط إذا أردت تغيير سلوك النموذج.',
  systemPromptParamsLabel: 'معلمات النموذج',
  systemPromptParamsHint: 'تُطبق التجاوزات فقط عند تفعيلها.',
  systemPromptUseDefaultLabel: 'استخدام افتراضيات النموذج',
  systemPromptUseDefaultHint: 'يتم استخدام افتراضيات النموذج.',
  systemPromptTemperatureLabel: 'Temperature',
  systemPromptTopPLabel: 'Top P',
  systemPromptMaxTokensLabel: 'Max Tokens',

  // ========== مزودو الذكاء الاصطناعي ==========
  sdkTypeOpenAICompatible: 'متوافق مع OpenAI',
  membershipModel: 'نموذج العضوية',
  customProviderSection: 'المزودون المخصصون',
  addCustomProvider: 'إضافة مزود مخصص',
  selectProviderPlaceholder: 'يرجى اختيار مزود من اليسار',
  providerConfigLoading: 'جاري تحميل إعدادات المزود...',
  documentation: 'التوثيق',
  enterApiKey: 'أدخل مفتاح API',
  testButton: 'اختبار',
  testing: 'جاري الاختبار...',
  baseUrlHint: 'اتركه فارغًا لاستخدام نقطة النهاية الافتراضية',
  customProviderNameLabel: 'اسم المزود',
  customProviderPlaceholder: 'مزود مخصص',
  deleteProvider: 'حذف المزود',
  modelsSection: 'النماذج',
  modelsCount: '{{count}} نماذج',
  searchModels: 'البحث في النماذج...',
  noMatchingModels: 'لم يتم العثور على نماذج مطابقة',
  enabledModels: 'النماذج المفعّلة',
  disabledModels: 'النماذج المعطّلة',
  noModelsConfigured: 'لم يتم تكوين أي نماذج',
  addCustomModel: 'إضافة نموذج مخصص',
  modelName: 'اسم النموذج',
  modelId: 'معرف النموذج',
  contextLength: 'طول السياق',
  outputLength: 'طول المخرجات',
  customBadge: 'مخصص',
  reasoningBadge: 'استدلال',
  multimodalBadge: 'متعدد الوسائط',
  toolsBadge: 'أدوات',
  delete: 'حذف',
  configureModel: 'تكوين النموذج',
  apiAddress: 'عنوان API',
  apiAddressOptional: 'عنوان API (اختياري)',
  sdkType: 'نوع SDK',
  testSuccess: 'الاتصال ناجح',
  testFailed: 'فشل الاتصال',

  // ========== إعدادات MCP ==========
  mcpStdioSection: 'خوادم Stdio',
  mcpHttpSection: 'خوادم HTTP',
  mcpStdioEmpty: 'لم يتم تكوين خوادم Stdio',
  mcpHttpEmpty: 'لم يتم تكوين خوادم HTTP',
  addStdioServer: 'إضافة خادم Stdio',
  addHttpServer: 'إضافة خادم HTTP',
  serverName: 'الاسم',
  serverCommand: 'الأمر',
  serverArgs: 'المعاملات',
  serverCwd: 'دليل العمل',
  serverUrl: 'URL',
  serverEnabled: 'مفعّل',
  serverAutoApprove: 'الموافقة التلقائية',
  envVariables: 'متغيرات البيئة',
  httpHeaders: 'رؤوس HTTP',
  addEnvVariable: 'إضافة متغير',
  addHeader: 'إضافة رأس',

  // ========== المزامنة السحابية ==========
  cloudSyncTitle: 'المزامنة السحابية',
  cloudSyncSubtitle: 'مزامنة ملاحظاتك عبر الأجهزة',
  cloudSyncNeedLogin: 'يتطلب تسجيل الدخول',
  cloudSyncNeedLoginDescription: 'سجّل الدخول لاستخدام المزامنة السحابية',
  cloudSyncNeedVault: 'يرجى فتح Vault أولاً',
  cloudSyncNeedVaultDescription: 'افتح Vault لتكوين المزامنة السحابية',
  cloudSyncEnabled: 'المزامنة السحابية مفعّلة',
  cloudSyncDisabled: 'المزامنة السحابية معطّلة',
  cloudSyncEnableFailed: 'فشل تفعيل المزامنة السحابية. يرجى المحاولة لاحقًا',
  cloudSyncSyncing: 'جاري المزامنة...',
  cloudSyncNeedsAttention: 'يتطلب الانتباه',
  cloudSyncSynced: 'تمت المزامنة',
  cloudSyncFailed: 'فشلت المزامنة',
  cloudSyncNotEnabled: 'غير مفعّل',
  cloudSyncOffline: 'غير متصل',
  cloudSyncWorkspace: 'مساحة العمل: {{name}}',
  cloudSyncPendingFiles: '{{count}} ملفات في انتظار المزامنة',
  cloudSyncLastSync: 'آخر: {{time}}',
  cloudSyncNeverSynced: 'لم تتم المزامنة أبداً',
  cloudSyncPaused: 'تم إيقاف المزامنة السحابية مؤقتاً',
  cloudSyncTriggered: 'تم تشغيل المزامنة',
  operationFailed: 'فشلت العملية، يرجى المحاولة لاحقاً',
  syncSection: 'المزامنة',
  syncNow: 'مزامنة الآن',
  enableCloudSync: 'تفعيل المزامنة السحابية',
  smartIndex: 'الفهرسة الذكية',
  smartIndexDescription: 'بناء فهرس دلالي لملفات Markdown لتمكين البحث الذكي',
  enableSmartIndex: 'تفعيل الفهرسة الذكية',
  smartIndexAIDescription: 'استخدام الذكاء الاصطناعي للبحث الدلالي',
  indexedFiles: 'الملفات المفهرسة',
  usage: 'الاستخدام',
  storageSpace: 'التخزين',
  usedSpace: 'المساحة المستخدمة',
  percentUsedPlan: '{{percent}}% مستخدم · خطة {{plan}}',
  currentPlan: 'الخطة الحالية: {{plan}} · الحد الأقصى لحجم الملف {{size}}',
  deviceInfo: 'معلومات الجهاز',
  deviceName: 'اسم الجهاز',
  deviceId: 'معرف الجهاز',
  filesCount: '{{count}} ملفات',

  // ========== حول ==========
  versionInfo: 'معلومات الإصدار',
  currentVersion: 'الإصدار الحالي',
  unknown: 'غير معروف',
  appVersion: 'الإصدار',
  checkForUpdates: 'التحقق من التحديثات',
  changelog: 'سجل التغييرات',
  licenses: 'تراخيص المصادر المفتوحة',
  termsOfService: 'شروط الخدمة',
  privacyPolicy: 'سياسة الخصوصية',
  copyright: '© {{year}} Moryflow. جميع الحقوق محفوظة.',

  // ========== أوصاف إعدادات MCP المسبقة ==========
  mcpFetchWebContent: 'جلب محتوى الويب',
  mcpBraveSearch: 'استخدام محرك بحث Brave',
  mcpLibraryDocs: 'الحصول على أحدث مستندات المكتبة',
  mcpBrowserAutomation: 'اختبار أتمتة المتصفح',
  mcpWebCrawl: 'زحف الويب واستخراج البيانات',
  reconnectAll: 'إعادة توصيل جميع الخوادم',
  manageServer: 'إدارة هذا الخادم',
  envVariablesLabel: 'متغيرات البيئة',
  httpHeadersLabel: 'رؤوس مخصصة',

  // ========== أنواع إدخال النموذج ==========
  modalityText: 'نص',
  modalityImage: 'صورة',
  modalityAudio: 'صوت',
  modalityVideo: 'فيديو',

  // ========== قدرات النموذج ==========
  capabilityAttachment: 'إدخال متعدد الوسائط',
  capabilityAttachmentDesc: 'يدعم الصور والملفات والمرفقات',
  capabilityReasoning: 'وضع الاستدلال',
  capabilityReasoningDesc: 'يدعم التفكير العميق/الاستدلال',
  capabilityTemperature: 'التحكم في درجة الحرارة',
  capabilityTemperatureDesc: 'ضبط عشوائية التوليد',
  capabilityToolCall: 'استدعاء الأداة',
  capabilityToolCallDesc: 'يدعم Function Calling',

  // ========== البحث عن النموذج وإضافته ==========
  searchModelPlaceholder: 'البحث عن النماذج، مثل gpt-4o، claude-3...',
  modelIdExample: 'مثال: gpt-4o-2024-11-20',
  modelNameExample: 'مثال: GPT-4o (2024-11)',
  ollamaModelExample: 'مثال: qwen2.5:7b',

  // ========== الشراء ==========
  createPaymentLinkFailed: 'فشل في إنشاء رابط الدفع، يرجى المحاولة لاحقاً',

  // ========== نافذة الدفع ==========
  completePayment: 'إتمام الدفع',
  paymentOpenedInBrowser: 'تم فتح صفحة الدفع في المتصفح، يرجى إتمام الدفع هناك',
  waitingForPayment: 'في انتظار الدفع...',
  paymentSuccessWillRedirect: 'ستتم إعادة توجيهك تلقائياً بعد نجاح الدفع',
  reopenPaymentPage: 'إعادة فتح صفحة الدفع',

  // ========== حذف الحساب إضافات ==========
  detailedFeedbackOptional: 'ملاحظات تفصيلية (اختياري)',
  emailMismatch: 'البريد الإلكتروني غير متطابق',

  // ========== الاشتراك ==========
  starterPlan: 'المبتدئ',
  basicPlan: 'الأساسي',
  proPlan: 'الاحترافي',
  loadProductsFailed: 'فشل تحميل المنتجات، يرجى المحاولة لاحقاً',
  subscriptionSuccess: 'تم الاشتراك بنجاح، المزايا متاحة الآن',
  recommended: 'موصى به',
  perMonth: '/شهر',
  perYear: '/سنة',
  monthlyCredits: '{{credits}} رصيد/شهر',
  currentPlanBadge: 'الخطة الحالية',
  subscribeNow: 'اشترك الآن',
  upgradeMembership: 'ترقية العضوية',
  choosePlanDescription: 'اختر الخطة المناسبة لك، افتح المزيد من الميزات',
  monthly: 'شهري',
  yearly: 'سنوي',
  savePercent: 'وفّر {{percent}}%',
  subscriptionNote: 'وفّر شهرين مع الفوترة السنوية. الرصيد يبقى كما هو. يمكنك الإلغاء في أي وقت.',

  // ========== إعدادات MCP إضافات ==========
  loadingConfig: 'جاري تحميل الإعدادات...',

  // ========== Sandbox Settings ==========
  sandboxSettings: 'الصندوق الآمن',
  sandboxSettingsDescription: 'التحكم في وصول الوكيل إلى نظام الملفات',
  sandboxMode: 'وضع الصندوق الآمن',
  sandboxModeNormal: 'عادي',
  sandboxModeNormalDescription: 'الوكيل يمكنه فقط الوصول إلى الملفات داخل المخزن',
  sandboxModeUnrestricted: 'غير مقيد',
  sandboxModeUnrestrictedDescription: 'الوكيل يمكنه الوصول إلى جميع الملفات في نظامك',
  sandboxAuthorizedPaths: 'المسارات المصرح بها',
  sandboxAuthorizedPathsDescription: 'المسارات التي تم منح الوكيل حق الوصول إليها',
  sandboxNoAuthorizedPaths: 'لا توجد مسارات مصرح بها',
  sandboxRemovePath: 'إزالة',
  sandboxClearAllPaths: 'مسح الكل',
  sandboxClearAllConfirm: 'هل أنت متأكد أنك تريد مسح جميع المسارات المصرح بها؟',
} as const satisfies Record<keyof typeof en, string>;

export default ar;
