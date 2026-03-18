import en from './en';

const ja = {
  // タイトルとメニュー
  settings: '設定',
  cancel: 'キャンセル',
  saveSettings: '設定を保存',
  loading: '読み込み中...',
  general: '一般',
  appearance: '外観',
  notifications: '通知',
  privacy: 'プライバシー',
  security: 'セキュリティ',
  advanced: '詳細設定',
  about: 'このアプリについて',
  version: 'バージョン',
  checkUpdate: 'アップデートを確認',
  reportBug: 'バグレポート',
  feedback: 'フィードバック',
  profile: 'プロフィール',
  preferences: '設定',

  // ページタイトルと説明
  profileDescription: '個人情報を管理',
  securityDescription: 'アカウントを保護するためにパスワードを変更',
  preferencesDescription: 'あなたの体験をカスタマイズ',
  verifyEmailTitle: 'メールを認証',
  verifyEmailDescription: '{email}に送信された認証コードを入力',

  // プロフィール
  username: 'ユーザー名',
  email: 'メールアドレス',
  emailCannotModify: 'メールアドレスは変更できません',
  usernameSupports: '文字、数字、アンダースコア、ハイフンが使用可能',

  // テーマオプション
  theme: 'テーマ',
  themeDescription: 'お好みのインターフェーステーマを選択',
  light: 'ライト',
  lightDescription: '明るいインターフェース、日中の使用に適しています',
  dark: 'ダーク',
  darkDescription: '目に優しいダークインターフェース、夜間の使用に適しています',
  system: 'システムに従う',
  systemDescription: '自動切り替え、システム設定に従います',

  // 言語オプション
  language: '言語',
  languageDescription: 'インターフェース表示言語を選択',
  english: '英語',
  simplifiedChinese: '簡体字中国語',
  languageFeatureInDevelopment: '注：言語切り替え機能は開発中です。近日公開予定',
  selectLanguage: '言語を選択',
  selectLanguageMessage: 'お好みの言語を選択してください',
  languageChangeNote: '選択後、インターフェース言語がすぐに変更されます',

  // セキュリティ設定
  currentPassword: '現在のパスワード',
  newPassword: '新しいパスワード',
  confirmPassword: '新しいパスワードの確認',
  verificationCode: '認証コード',
  sendVerificationCode: '認証コードを送信',
  sendCode: 'コードを送信',
  resendCode: '再送信',
  resendTimer: '再送信（{seconds}秒）',
  backToModify: '戻って修正',
  confirmModify: '変更を確認',
  enterNewEmail: '新しいメールアドレスを入力',

  // パスワード強度
  passwordStrengthWeak: '弱い',
  passwordStrengthMedium: '普通',
  passwordStrengthStrong: '強い',
  passwordStrengthVeryStrong: '非常に強い',

  // 操作ボタン
  save: '保存',
  saveChanges: '変更を保存',
  saving: '保存中...',
  applyChanges: '変更を適用',

  // パスワードルールとヒント
  passwordMinLength: 'パスワードは最低{length}文字である必要があります',
  passwordStrengthTips:
    '• パスワードは最低6文字\n• 文字、数字、特殊文字を含むことを推奨\n• 次のステップでメールに認証コードを送信します',
  verificationTips:
    '• 認証コードは10分間有効です\n• コードが届かない場合は、スパムフォルダーをご確認ください\n• パスワード変更後は再ログインが必要です',

  // ユーザー名検証
  usernameMinLength: 'ユーザー名は最低{min}文字必要です（現在{current}文字）',
  usernameOnlyAllowedChars: 'ユーザー名は文字、数字、アンダースコア、ハイフンのみ使用可能',
  usernamePlaceholder: 'ユーザー名を入力（{min}-{max}文字）',

  // パスワード入力ヒント
  enterCurrentPassword: '現在のパスワードを入力してください',
  enterNewPassword: '新しいパスワードを入力してください（最低6文字）',
  confirmNewPassword: '新しいパスワードを再度入力してください',
  enterVerificationCode: '6桁の認証コードを入力してください',

  // 成功とエラーメッセージ
  profileUpdateSuccess: 'プロフィールを更新しました',
  passwordChangeSuccess: 'パスワードを変更しました。再ログインしてください',
  verificationCodeSent: '認証コードを{email}に送信しました',
  verificationCodeResent: '認証コードを再送信しました',

  // エラーメッセージはuserTranslationsとvalidationTranslationsに含まれています

  // 新規追加のモバイル設定項目
  changePassword: 'パスワードの変更',
  dataManagement: 'データ管理',

  // 補足の不足しているキー
  selectThemeMode: 'テーマモードを選択',
  systemMode: 'システムモード',
  lightMode: 'ライトモード',
  darkMode: 'ダークモード',
  databaseInfo: 'データベース情報',
  storageType: 'ストレージタイプ',
  databaseSize: 'データベースサイズ',
  bufferZone: 'バッファゾーン',
  pendingWrites: '{{count}}件の保留中の書き込み',
  backToEdit: '編集に戻る',
  confirmChanges: '変更を確認',
  verificationCodeHints:
    '• 認証コードは10分間有効です\n• コードが届かない場合は、スパムフォルダーをご確認ください\n• パスワード変更後は再ログインが必要です',
  passwordHints:
    '• パスワードは最低6文字\n• 文字、数字、特殊文字を含むことを推奨\n• 次のステップでメールに認証コードを送信します',
  status: 'ステータス',

  // アカウント削除
  deleteAccount: 'アカウントを削除',
  deleteAccountTitle: 'アカウントを削除',
  deleteAccountWarning:
    'アカウントを削除すると、すべてのデータが永久に消去されます。この操作は取り消せません。',
  selectDeleteReason: 'アカウントを削除する理由を選択してください',
  deleteReasonNotUseful: 'この製品はもう必要ない',
  deleteReasonFoundAlternative: 'より良い代替品を見つけた',
  deleteReasonTooExpensive: '価格が高すぎる',
  deleteReasonTooComplex: '使い方が複雑すぎる',
  deleteReasonBugsIssues: 'バグや問題が多すぎる',
  deleteReasonOther: 'その他の理由',
  deleteFeedbackPlaceholder: '詳細をお聞かせください（任意、最大500文字）',
  deleteConfirmationHint: '確認のためにメールアドレスを入力してください',
  confirmDeleteAccount: 'アカウントの削除を確認',
  deleting: '削除中...',
  deleteAccountSuccess: 'アカウントが削除されました',
  deleteAccountError: 'アカウントの削除に失敗しました',

  // PC 重置設定
  resetSettings: '設定をリセット',
  resetSettingsDescription:
    'すべての設定データを削除して初期状態に戻します。ワークスペース内のファイルには影響しません。アプリは自動的に再起動します。',
  resetSettingsConfirm:
    '設定をリセットしますか？\n\nすべての設定データが削除されます（ワークスペース内のファイルには影響しません）。アプリは自動的に再起動します。',
  resetSettingsSuccess: 'リセット完了、再起動中...',
  resetSettingsFailed: 'リセットに失敗しました。後でもう一度お試しください',
  resetSettingsNotSupported: 'この環境ではこの操作はサポートされていません',
  resetButton: 'リセット',

  // テーマモードの説明
  lightModeDescription: '明るい環境に最適',
  darkModeDescription: '夜間や暗い環境に最適',
  systemModeDescription: 'OSと自動的に同期',
  closeBehavior: 'ウィンドウを閉じるとき',
  closeBehaviorDescription: 'ウィンドウの閉じるボタンを押したときの動作を選択します。',
  closeBehaviorHide: 'メニューバーに隠す',
  closeBehaviorHideDescription: 'Moryflow をメニューバーで引き続き実行します。',
  closeBehaviorQuit: 'アプリを終了',
  closeBehaviorQuitDescription: 'Moryflow を完全に終了します。',
  closeBehaviorUpdateFailed: '終了時の動作の更新に失敗しました',
  launchAtLogin: 'ログイン時に起動',
  launchAtLoginDescription: 'サインイン時に Moryflow を自動的に起動します。',
  launchAtLoginUpdateFailed: 'ログイン時起動設定の更新に失敗しました',
  runtimeSettingsLoadFailed: 'アプリのランタイム設定の読み込みに失敗しました',
  updateChannel: '更新チャンネル',
  updateChannelDescription:
    'このデバイスで安定版を追従するか、ベータ版プレビューを受け取るかを選択します。',
  updateChannelStable: '安定版',
  updateChannelStableDescription: '日常利用向けの正式リリースのみを受け取ります。',
  updateChannelBeta: 'ベータ',
  updateChannelBetaDescription: 'プレビュー版を早く受け取りますが、不安定になる場合があります。',
  updateChannelUpdateFailed: 'リリースチャンネルの更新に失敗しました',
  automaticUpdateChecks: '自動アップデート確認',
  automaticUpdateChecksDescription: '起動後にバックグラウンドで新しいバージョンを確認します。',
  autoCheckUpdateFailed: '自動確認設定の更新に失敗しました',
  manualUpdatePolicyDescription:
    'ダウンロードとインストールは常に確認が必要です。Moryflow が強制的に更新を適用することはありません。',

  // ========== PC 設定ナビゲーション ==========
  account: 'アカウント',
  accountDescription: 'ログインとメンバーシップ',
  generalDescription: '外観と設定',
  personalization: 'パーソナライズ',
  personalizationDescription: 'カスタム指示',
  providers: 'AIプロバイダー',
  providersDescription: 'APIキーとモデル',
  mcp: 'MCP',
  mcpDescription: 'ツール拡張',
  cloudSync: 'クラウド同期',
  cloudSyncDescription: 'マルチデバイス同期',
  telegram: 'Telegram',
  telegramDescription: 'Bot API チャネル',
  aboutDescription: 'バージョン情報',

  // ========== モデル設定 ==========
  defaultModelLabel: 'デフォルトモデル（任意）',
  defaultModelFormatHint:
    '形式：プロバイダーID/モデルID。空の場合、最初に有効なプロバイダーのデフォルトモデルが使用されます。',
  defaultModelConfigDescription:
    '「AIプロバイダー」ページでプロバイダーとモデルを設定してから、ここでグローバルデフォルトモデルを設定してください。',

  // ========== Personalization ==========
  customInstructionsLabel: 'カスタム指示',
  customInstructionsHint:
    '文章スタイル、出力形式、コラボレーション時の好みをここに記入してください。',
  customInstructionsPlaceholder: '例：回答は簡潔に。UI文言は英語、技術説明は中国語で出力する。',

  // ========== AIプロバイダー ==========
  sdkTypeOpenAICompatible: 'OpenAI互換',
  membershipModel: 'メンバーシップモデル',
  customProviderSection: 'カスタムプロバイダー',
  addCustomProvider: 'カスタムプロバイダーを追加',
  selectProviderPlaceholder: '左側からプロバイダーを選択してください',
  providerConfigLoading: 'プロバイダー設定を読み込み中...',
  documentation: 'ドキュメント',
  enterApiKey: 'APIキーを入力',
  testButton: 'テスト',
  testing: 'テスト中...',
  baseUrlHint: '空欄でデフォルトエンドポイントを使用',
  customProviderNameLabel: 'プロバイダー名',
  customProviderPlaceholder: 'カスタムプロバイダー',
  deleteProvider: 'プロバイダーを削除',
  modelsSection: 'モデル',
  modelsCount: '{{count}}個のモデル',
  searchModels: 'モデルを検索...',
  noMatchingModels: '一致するモデルが見つかりません',
  enabledModels: '有効なモデル',
  disabledModels: '無効なモデル',
  noModelsConfigured: 'モデルが設定されていません',
  addCustomModel: 'カスタムモデルを追加',
  modelName: 'モデル名',
  modelId: 'モデルID',
  contextLength: 'コンテキスト長',
  outputLength: '出力長',
  customBadge: 'カスタム',
  reasoningBadge: '推論',
  multimodalBadge: 'マルチモーダル',
  toolsBadge: 'ツール',
  delete: '削除',
  configureModel: 'モデルを設定',
  apiAddress: 'APIアドレス',
  apiAddressOptional: 'APIアドレス（任意）',
  sdkType: 'SDKタイプ',
  testSuccess: '接続成功',
  testFailed: '接続失敗',

  // ========== MCP設定 ==========
  mcpStdioSection: 'Stdioサーバー',
  mcpHttpSection: 'HTTPサーバー',
  mcpStdioEmpty: 'Stdioサーバーが設定されていません',
  mcpHttpEmpty: 'HTTPサーバーが設定されていません',
  addStdioServer: 'Stdioサーバーを追加',
  addHttpServer: 'HTTPサーバーを追加',
  serverName: '名前',
  serverCommand: 'コマンド',
  serverArgs: '引数',
  serverCwd: '作業ディレクトリ',
  serverUrl: 'URL',
  serverEnabled: '有効',
  serverAutoApprove: '自動承認',
  envVariables: '環境変数',
  httpHeaders: 'HTTPヘッダー',
  addEnvVariable: '変数を追加',
  addHeader: 'ヘッダーを追加',

  // ========== クラウド同期 ==========
  cloudSyncTitle: 'クラウド同期',
  cloudSyncSubtitle: 'デバイス間の任意ファイル同期。Memory は未設定でも利用できます。',
  cloudSyncNeedLogin: 'ログインが必要です',
  cloudSyncNeedLoginDescription: 'クラウド同期を使用するにはログインしてください',
  cloudSyncNeedVault: 'まずワークスペースを開いてください',
  cloudSyncNeedVaultDescription: 'クラウド同期を設定するにはワークスペースを開いてください',
  cloudSyncEnabled: 'クラウド同期が有効です',
  cloudSyncDisabled: 'クラウド同期が無効です',
  cloudSyncEnableFailed: 'クラウド同期の有効化に失敗しました。後でもう一度お試しください',
  cloudSyncSyncing: '同期中...',
  cloudSyncNeedsAttention: '注意が必要',
  cloudSyncSynced: '同期完了',
  cloudSyncConflictCopyReady: '競合コピーを保持しました',
  cloudSyncFailed: '同期失敗',
  cloudSyncNotEnabled: '未有効',
  cloudSyncOffline: 'オフライン',
  cloudSyncUnavailable: 'モバイルでは利用できません',
  cloudSyncRecoveryDescription: '同期を再開すると、前回の変更を安全に完了できます。',
  cloudSyncOfflineDescription: 'クラウドに接続できません。オンラインに戻ったら再試行してください。',
  cloudSyncSetupDescription:
    'このワークスペースをデバイス間で同期したい場合のみ、クラウド同期を有効にしてください。',
  cloudSyncMobileUnavailableDescription:
    'Workspace Profile の再設計が完了するまで、モバイルでは Cloud Sync を利用できません。同期の管理はデスクトップ版を使用してください。',
  cloudSyncConflictCopyDescription: '内容が失われないよう、競合コピーを保持しました。',
  cloudSyncWorkspace: 'ワークスペース: {{name}}',
  cloudSyncPendingFiles: '{{count}}件のファイルが同期待ち',
  cloudSyncLastSync: '最終: {{time}}',
  cloudSyncNeverSynced: '未同期',
  cloudSyncAvailableOnDesktop: 'デスクトップで利用可能',
  cloudSyncPaused: 'クラウド同期が一時停止されました',
  cloudSyncTriggered: '同期がトリガーされました',
  cloudSyncResumeRecovery: '復旧を再開',
  cloudSyncTryAgain: '再試行',
  cloudSyncOpenConflictCopy: '競合コピーを開く',
  cloudSyncOpenFirstConflictCopy: '最初の競合コピーを開く',
  syncSettings: '同期設定',
  operationFailed: '操作に失敗しました。後でもう一度お試しください',
  syncSection: '同期',
  syncNow: '今すぐ同期',
  enableCloudSync: 'クラウド同期を有効にする',
  smartIndex: 'スマートインデックス',
  smartIndexDescription:
    'Markdownファイルのセマンティックインデックスを作成してスマート検索を有効にする',
  enableSmartIndex: 'スマートインデックスを有効にする',
  smartIndexAIDescription: 'AIを使用したセマンティック検索',
  indexedFiles: 'インデックス済みファイル',
  usage: '使用量',
  storageSpace: 'ストレージ',
  usedSpace: '使用中のスペース',
  percentUsedPlan: '{{percent}}%使用中 · {{plan}}プラン',
  currentPlan: '現在のプラン: {{plan}} · 最大ファイルサイズ {{size}}',
  deviceInfo: 'デバイス情報',
  deviceName: 'デバイス名',
  deviceId: 'デバイスID',
  filesCount: '{{count}}件のファイル',

  // ========== バージョン情報 ==========
  versionInfo: 'バージョン情報',
  currentVersion: '現在のバージョン',
  latestVersion: '最新バージョン',
  appUpdates: 'アプリの更新',
  lastCheckedAt: '最終確認',
  neverChecked: '未確認',
  upToDate: '最新の状態です',
  newVersionAvailable: '新しいバージョンがあります',
  updateDownloading: '更新をダウンロード中',
  updateReadyToInstall: 'インストールの準備ができました',
  unknown: '不明',
  appVersion: 'バージョン',
  checkForUpdates: 'アップデートを確認',
  downloadUpdate: 'アップデートをダウンロード',
  restartToInstall: '再起動してインストール',
  skipThisVersion: 'このバージョンをスキップ',
  releaseNotes: 'リリースノート',
  downloadFromBrowser: 'ブラウザでダウンロード',
  changelog: '更新履歴',
  licenses: 'オープンソースライセンス',
  termsOfService: '利用規約',
  privacyPolicy: 'プライバシーポリシー',
  copyright: '© {{year}} Moryflow. All rights reserved.',

  // ========== MCP プリセット説明 ==========
  mcpFetchWebContent: 'Webコンテンツを取得',
  mcpBraveSearch: 'Brave検索エンジンを使用',
  mcpLibraryDocs: '最新のライブラリドキュメントを取得',
  mcpBrowserAutomation: 'ブラウザ自動化テスト',
  mcpWebCrawl: 'Webクロールとデータ抽出',
  reconnectAll: 'すべてのサーバーに再接続',
  manageServer: 'このサーバーを管理',
  envVariablesLabel: '環境変数',
  httpHeadersLabel: 'カスタムヘッダー',

  // ========== モデル入力タイプ ==========
  modalityText: 'テキスト',
  modalityImage: '画像',
  modalityAudio: 'オーディオ',
  modalityVideo: 'ビデオ',

  // ========== モデル機能 ==========
  capabilityAttachment: 'マルチモーダル入力',
  capabilityAttachmentDesc: '画像、ファイル、添付ファイルをサポート',
  capabilityReasoning: '推論モード',
  capabilityReasoningDesc: '深い思考/推論をサポート',
  capabilityTemperature: '温度調整',
  capabilityTemperatureDesc: '生成のランダム性を調整',
  capabilityToolCall: 'ツール呼び出し',
  capabilityToolCallDesc: 'Function Callingをサポート',

  // ========== モデル検索と追加 ==========
  searchModelPlaceholder: 'モデルを検索（例：gpt-4o、claude-3...）',
  modelIdExample: '例：gpt-4o-2024-11-20',
  modelNameExample: '例：GPT-4o (2024-11)',
  ollamaModelExample: '例：qwen2.5:7b',

  // ========== 購入 ==========
  createPaymentLinkFailed: '支払いリンクの作成に失敗しました。後でもう一度お試しください',

  // ========== 支払いダイアログ ==========
  completePayment: '支払いを完了',
  paymentOpenedInBrowser: 'ブラウザで支払いページが開きました。ブラウザで支払いを完了してください',
  waitingForPayment: '支払い待ち...',
  paymentSuccessWillRedirect: '支払い成功後、自動的にアプリに戻ります',
  reopenPaymentPage: '支払いページを再度開く',

  // ========== アカウント削除追加 ==========
  detailedFeedbackOptional: '詳細なフィードバック（任意）',
  emailMismatch: 'メールアドレスが一致しません',

  // ========== サブスクリプション ==========
  starterPlan: 'スタータープラン',
  basicPlan: 'ベーシックプラン',
  proPlan: 'プロプラン',
  starterPlanTagline: '軽めの個人利用に',
  basicPlanTagline: '継続的に作業するクリエイター向け',
  proPlanTagline: 'ヘビーユーザーとチーム向け',
  loadProductsFailed: '製品の読み込みに失敗しました。後でもう一度お試しください',
  subscriptionSuccess: 'サブスクリプション成功、特典が有効になりました',
  recommended: 'おすすめ',
  perMonth: '/月',
  perYear: '/年',
  monthlyCredits: '月間{{credits}}クレジット',
  currentPlanBadge: '現在のプラン',
  currentPlanHelper: '現在利用中のプランです',
  currentPlanCta: 'このワークスペースに含まれています',
  subscriptionSummaryEyebrow: 'ワークスペースプラン',
  subscriptionSummaryTitle: 'ワークスペース向けのシンプルな料金体系',
  subscriptionSummaryDescription: 'クレジット数、同期、サポート内容でプランを選択できます。',
  subscribeNow: '今すぐ登録',
  upgradeMembership: 'メンバーシップをアップグレード',
  choosePlanDescription: 'あなたに合ったプランを選んで、より多くの機能を利用しましょう',
  monthly: '月払い',
  yearly: '年払い',
  savePercent: '{{percent}}%お得',
  annualBillingHighlight: '年払いで 2 か月分お得',
  equivalentMonthly: '月あたり ${{price}} 相当',
  allPaidPlansInclude: 'すべての有料プランに含まれる内容',
  subscriptionNote: '年払いで2ヶ月分節約。クレジットはそのまま。いつでもキャンセル可能。',

  // ========== MCP設定追加 ==========
  loadingConfig: '設定を読み込み中...',

  // ========== Sandbox Settings ==========
  sandboxSettings: 'サンドボックス',
  sandboxSettingsDescription: 'エージェントのファイルシステムアクセスを制御',
  sandboxMode: 'サンドボックスモード',
  sandboxModeNormal: '通常',
  sandboxModeNormalDescription: 'エージェントは現在のワークスペース内のファイルのみアクセス可能',
  sandboxModeUnrestricted: '無制限',
  sandboxModeUnrestrictedDescription: 'エージェントはシステム上のすべてのファイルにアクセス可能',
  sandboxAuthorizedPaths: '承認済みパス',
  sandboxAuthorizedPathsDescription: 'エージェントがアクセス可能なワークスペース外パス',
  sandboxAddPath: 'パスを追加',
  sandboxPathPlaceholder: '/absolute/path/to/folder',
  sandboxPathMustBeAbsolute: '絶対パスを入力してください',
  sandboxNoAuthorizedPaths: '承認済みパスはありません',
  sandboxRemovePath: '削除',
  sandboxClearAllPaths: 'すべてクリア',
  sandboxClearAllConfirm: 'すべての承認済みパスをクリアしてよろしいですか？',

  // ========== クレジットパック ==========
  buyCredits: 'クレジット購入',
  creditPackPopular: '人気',
  creditPackCredits: '{{credits}} クレジット',
  creditPackBuyNow: '今すぐ購入',
  creditPackExpiry: 'クレジットは購入後365日で期限切れとなります。',
  creditPackUsageOrder: '利用順序: 日次無料分 → サブスクリプション分 → 購入クレジット。',
  creditPackPaymentSuccess: '支払い完了、クレジットが追加されました',

  // ========== ベータ通知 ==========
  betaNoticePrefix: 'ベータ期間中は購入できません。',
  betaNoticeLinkText: 'Discord',
  betaNoticeSuffix: ' で引き換えコードを入手してください！',
  community: 'コミュニティ',
  joinDiscord: 'Discord に参加',
  communityDescription:
    'サポートを受けたり、フィードバックを共有したり、他のユーザーと繋がれます。',

  // ========== MCPコンポーネント ==========
  // mcp-list
  mcpServersTitle: 'MCPサーバー',
  mcpAdd: '追加',
  mcpUntitled: '名称未設定',
  mcpTypeStdio: 'Stdio',
  mcpTypeHttp: 'HTTP',
  mcpNoServersYet: 'サーバーはまだありません',

  // mcp-details
  mcpUntitledServer: '名称未設定サーバー',
  mcpEnabled: '有効',
  mcpTest: 'テスト',
  mcpDelete: '削除',
  mcpTypeLabel: 'タイプ',
  mcpTypeStdioOption: 'コマンドライン (Stdio)',
  mcpTypeHttpOption: 'HTTP',
  mcpStdioDescription: 'Moryflow がインストールした MCP マネージドパッケージを実行',
  mcpHttpDescription: 'リモート HTTP MCP サーバーに接続',
  mcpNameLabel: '名前',
  mcpBinNameLabel: 'バイナリ名（任意）',
  mcpNpmPackageLabel: 'NPM パッケージ',
  mcpArgumentsLabel: '引数（スペース区切り）',
  mcpEnvVarsLabel: '環境変数',
  mcpUrlLabel: 'URL',
  mcpAuthHeaderLabel: '認証ヘッダー（任意）',
  mcpCustomHeadersLabel: 'カスタムヘッダー',

  // mcp-env-editor
  mcpEnvNoEntries: 'まだエントリがありません。追加して始めましょう。',

  // mcp-empty-state
  mcpNoServersTitle: 'MCPサーバーはまだありません',
  mcpNoServersDescription:
    'MCPを使うと、AIが検索やWebスクレイピングなどの外部ツールを呼び出せます。',
  mcpAddServer: 'サーバーを追加',
  mcpOrPreset: 'またはプリセットから始める：',
  mcpRequiresEnvVars: '* 環境変数の設定が必要',

  // mcp-tool-list
  mcpToolsCount: 'ツール ({{count}})',
  mcpToolNamesUnavailable: 'ツール名を取得できません。再度検証してください。',

  // mcp-verified-tools
  mcpVerifiedToolsCount: '検証済みツール ({{count}})',

  // mcp-test-result-dialog
  mcpTestSucceeded: 'テスト成功',
  mcpTestFailed: 'テスト失敗',
  mcpTestConnected: 'MCPサーバーに接続しました',
  mcpTestOk: 'OK',

  // ========== プロバイダーコンポーネント ==========
  // custom-provider-models
  providerModelsLabel: 'モデル',
  providerNoModelsYet: 'まだモデルがありません。追加するとテストやモデル選択が可能になります。',
  providerSearchModels: 'モデルを検索...',
  providerDeleteModelConfirm: 'モデル「{{name}}」を削除しますか？',
  providerDeleteModelAriaLabel: 'モデルを削除',
  providerNoMatchingModels: '一致するモデルが見つかりません',

  // membership-details
  membershipSignInPrompt: 'メンバーシップモデルを利用するにはログインしてください',
  membershipModelsTitle: 'メンバーシップモデル',
  membershipCreditsAvailable: '{{displayName}} · {{credits}}クレジット利用可能',
  membershipInfoNote:
    'メンバーシップモデルはプラットフォームが提供します。使用するとクレジットを消費しますが、APIキーは不要です。',
  membershipNoModelsYet: 'メンバーシップモデルはまだありません',
  membershipAvailableModels: '利用可能なモデル',
  membershipLockedModels: '上位プランで解放',
  membershipAvailableBadge: '利用可能',
  membershipCurrentCredits: '現在のクレジット',
  membershipDailyCredits: '日次:',
  membershipSubscriptionCredits: 'サブスクリプション:',
  membershipPurchasedCredits: '購入済み:',

  // ollama-panel
  ollamaModelLibraryLink: 'モデルライブラリ',
  ollamaConnectionStatus: '接続状態',
  ollamaConnected: '接続済み (v{{version}})',
  ollamaDisconnected: '未接続',
  ollamaServiceUrl: 'サービスURL（任意）',
  ollamaServiceUrlHint: '空欄でデフォルトを使用',
  ollamaLocalModels: 'ローカルモデル',
  ollamaModelsCount: '{{count}}個のモデル',
  ollamaDownloadModels: 'モデルをダウンロード',
  ollamaNoMatchingModels: '一致するモデルが見つかりません',
  ollamaNoLocalModels: 'ローカルモデルはありません',
  ollamaNoLocalModelsHint: '「モデルをダウンロード」をクリックしてライブラリから取得してください',
  ollamaCannotConnect: 'Ollamaに接続できません',
  ollamaInstallHint: 'Ollamaがインストールされ、実行中であることを確認してください',
  ollamaDownloadLink: 'Ollamaをダウンロード',
  ollamaLoading: '読み込み中...',

  // model-library-dialog
  modelLibraryTitle: 'モデルライブラリ',
  modelLibraryBrowseAll: 'すべて表示',
  modelLibraryDownloads: 'ダウンロード数: {{count}}',
  modelLibraryNoMatching: '一致するモデルが見つかりません',
  modelLibraryManualInput: 'またはモデル名を入力：',
  modelLibraryDownload: 'ダウンロード',

  // add-model-dialog
  addModelTitle: 'カスタムモデルを追加',
  addModelDescription: 'ランタイム制限と機能プリセットを設定してモデルを追加します。',
  addModelSearchLibrary: 'モデルライブラリを検索',
  addModelSearchHint: '{{count}}個のモデルを検索してクリックで自動入力。',
  addModelOrFillManually: 'または手動で入力',
  addModelIdLabel: 'モデルID',
  addModelIdRequired: 'モデルIDは必須です',
  addModelIdHint: 'API呼び出しでのモデル識別子として使用',
  addModelNameLabel: 'モデル名',
  addModelNameRequired: 'モデル名は必須です',
  addModelNameHint: 'UIに表示されます',
  addModelIdExists: 'モデルIDはすでに存在します',
  addModelContextWindow: 'コンテキストウィンドウ',
  addModelMaxOutput: '最大出力',
  addModelTokens: '{{count}}Kトークン',
  addModelCapabilities: 'モデル機能',
  addModelDefaultThinkingLevel: 'デフォルト思考レベル',
  addModelInputTypes: 'サポートされる入力タイプ',
  addModelInputTypesHint:
    'このモデルがサポートする入力タイプを選択してください。テキストは必須です。',
  addModelCancel: 'キャンセル',
  addModelSubmit: '追加',

  // edit-model-dialog
  editModelPresetTitle: 'プリセットモデルをカスタマイズ',
  editModelCustomTitle: 'カスタムモデルを編集',
  editModelDescription: 'ランタイム用のモデル制限と機能を設定します。',
  editModelIdLabel: 'モデルID',
  editModelIdPresetHint: 'プリセットモデルIDは変更できません',
  editModelIdCustomHint: 'API呼び出しでのモデル識別子として使用',
  editModelDisplayName: '表示名',
  editModelNameRequired: 'モデル名は必須です',
  editModelNameHint: 'UIに表示されます',
  editModelSave: '保存',
} as const satisfies Record<keyof typeof en, string>;

export default ja;
