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
    'すべての設定データを削除して初期状態に戻します。Vaultのファイルには影響しません。再起動が必要です。',
  resetSettingsConfirm:
    '設定をリセットしますか？\n\nすべての設定データが削除されます（Vaultのファイルには影響しません）。再起動後に反映されます。',
  resetSettingsSuccess: 'リセット完了、アプリを再起動してください',
  resetSettingsFailed: 'リセットに失敗しました。後でもう一度お試しください',
  resetSettingsNotSupported: 'この環境ではこの操作はサポートされていません',
  resetButton: 'リセット',

  // テーマモードの説明
  lightModeDescription: '明るい環境に最適',
  darkModeDescription: '夜間や暗い環境に最適',
  systemModeDescription: 'OSと自動的に同期',

  // ========== PC 設定ナビゲーション ==========
  account: 'アカウント',
  accountDescription: 'ログインとメンバーシップ',
  generalDescription: '外観と設定',
  systemPrompt: 'システムプロンプト',
  systemPromptDescription: 'プロンプトとパラメータ',
  providers: 'AIプロバイダー',
  providersDescription: 'APIキーとモデル',
  mcp: 'MCP',
  mcpDescription: 'ツール拡張',
  cloudSync: 'クラウド同期',
  cloudSyncDescription: 'マルチデバイス同期',
  aboutDescription: 'バージョン情報',

  // ========== モデル設定 ==========
  defaultModelLabel: 'デフォルトモデル（任意）',
  defaultModelFormatHint:
    '形式：プロバイダーID/モデルID。空の場合、最初に有効なプロバイダーのデフォルトモデルが使用されます。',
  defaultModelConfigDescription:
    '「AIプロバイダー」ページでプロバイダーとモデルを設定してから、ここでグローバルデフォルトモデルを設定してください。',

  // ========== System Prompt ==========
  systemPromptModeLabel: 'モード',
  systemPromptModeHint: 'デフォルトではプロンプトとパラメータを非表示にします。',
  systemPromptModeDefault: 'デフォルトを使用',
  systemPromptModeCustom: 'カスタム',
  systemPromptDefaultHint: '内蔵プロンプトとモデルのデフォルト設定を使用中です。',
  systemPromptTemplateLabel: 'システムプロンプト',
  systemPromptTemplatePlaceholder: 'システムプロンプトを入力...',
  systemPromptTemplateHint: 'カスタム内容はデフォルトを置き換えます。',
  systemPromptResetTemplate: 'デフォルトテンプレートに戻す',
  systemPromptAdvancedLabel: '高度な設定（任意）',
  systemPromptAdvancedHint: 'モデル挙動を調整したい場合のみ使用します。',
  systemPromptParamsLabel: 'モデルパラメータ',
  systemPromptParamsHint: '有効化した項目のみ上書きされます。',
  systemPromptUseDefaultLabel: 'モデルのデフォルトを使用',
  systemPromptUseDefaultHint: 'モデルのデフォルトを使用中です。',
  systemPromptTemperatureLabel: 'Temperature',
  systemPromptTopPLabel: 'Top P',
  systemPromptMaxTokensLabel: 'Max Tokens',

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
  cloudSyncSubtitle: 'デバイス間でノートを同期',
  cloudSyncNeedLogin: 'ログインが必要です',
  cloudSyncNeedLoginDescription: 'クラウド同期を使用するにはログインしてください',
  cloudSyncNeedVault: 'まずVaultを開いてください',
  cloudSyncNeedVaultDescription: 'クラウド同期を設定するにはVaultを開いてください',
  cloudSyncEnabled: 'クラウド同期が有効です',
  cloudSyncDisabled: 'クラウド同期が無効です',
  cloudSyncEnableFailed: 'クラウド同期の有効化に失敗しました。後でもう一度お試しください',
  cloudSyncSyncing: '同期中...',
  cloudSyncSynced: '同期完了',
  cloudSyncFailed: '同期失敗',
  cloudSyncNotEnabled: '未有効',
  cloudSyncOffline: 'オフライン',
  cloudSyncWorkspace: 'ワークスペース: {{name}}',
  cloudSyncPendingFiles: '{{count}}件のファイルが同期待ち',
  cloudSyncLastSync: '最終: {{time}}',
  cloudSyncNeverSynced: '未同期',
  cloudSyncPaused: 'クラウド同期が一時停止されました',
  cloudSyncTriggered: '同期がトリガーされました',
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
  unknown: '不明',
  appVersion: 'バージョン',
  checkForUpdates: 'アップデートを確認',
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
  loadProductsFailed: '製品の読み込みに失敗しました。後でもう一度お試しください',
  subscriptionSuccess: 'サブスクリプション成功、特典が有効になりました',
  recommended: 'おすすめ',
  perMonth: '/月',
  perYear: '/年',
  monthlyCredits: '月間{{credits}}クレジット',
  currentPlanBadge: '現在のプラン',
  subscribeNow: '今すぐ登録',
  upgradeMembership: 'メンバーシップをアップグレード',
  choosePlanDescription: 'あなたに合ったプランを選んで、より多くの機能を利用しましょう',
  monthly: '月払い',
  yearly: '年払い',
  savePercent: '{{percent}}%お得',
  subscriptionNote: '年払いで2ヶ月分節約。クレジットはそのまま。いつでもキャンセル可能。',

  // ========== MCP設定追加 ==========
  loadingConfig: '設定を読み込み中...',

  // ========== Sandbox Settings ==========
  sandboxSettings: 'サンドボックス',
  sandboxSettingsDescription: 'エージェントのファイルシステムアクセスを制御',
  sandboxMode: 'サンドボックスモード',
  sandboxModeNormal: '通常',
  sandboxModeNormalDescription: 'エージェントはVault内のファイルのみアクセス可能',
  sandboxModeUnrestricted: '無制限',
  sandboxModeUnrestrictedDescription: 'エージェントはシステム上のすべてのファイルにアクセス可能',
  sandboxAuthorizedPaths: '承認済みパス',
  sandboxAuthorizedPathsDescription: 'エージェントにアクセス権が付与されたパス',
  sandboxNoAuthorizedPaths: '承認済みパスはありません',
  sandboxRemovePath: '削除',
  sandboxClearAllPaths: 'すべてクリア',
  sandboxClearAllConfirm: 'すべての承認済みパスをクリアしてよろしいですか？',
} as const satisfies Record<keyof typeof en, string>;

export default ja;
