import en from './en';

const ja = {
  newConversation: '新しい会話',
  deleteConversation: '会話を削除',
  clearHistory: '履歴をクリア',
  sendMessage: 'メッセージを送信',
  regenerate: '再生成',
  copy: 'コピー',
  copySuccess: 'クリップボードにコピーしました',
  typing: '入力中...',
  thinking: '考えています...',
  messagePlaceholder: 'メッセージを入力...',
  attachFile: 'ファイルを添付',
  referenceNote: 'ノートを参照',
  history: '履歴',
  noHistory: '会話履歴がありません',
  // エラーメッセージ
  sendFailed: 'メッセージの送信に失敗しました',
  networkError: 'ネットワークエラーです。接続を確認してください',
  serverError: 'サーバーエラーです。しばらくしてから再試行してください',
  quotaExceeded: 'クォータを超過しました',
  // 成功メッセージ
  conversationDeleted: '会話を削除しました',
  conversationRenamed: '会話名を変更しました',
  historyCleared: '履歴をクリアしました',
  messageDeleted: 'メッセージを削除しました',
  renameFailed: '名前の変更に失敗しました。もう一度試してください',
  deleteFailed: '削除に失敗しました。もう一度試してください',
  // インターフェースと対話框
  renameConversationTitle: '会話名を変更',
  deleteConfirmTitle: '削除の確認',
  deleteConfirmDescription: 'この操作は取り消せません。この会話を削除してもよろしいですか？',
  deleteConfirmWithTitle: '会話「{{title}}」を削除してもよろしいですか？この操作は取り消せません。',
  titleLabel: 'タイトル',
  newTitlePlaceholder: '新しい会話タイトルを入力',
  // エラー境界
  chatErrorTitle: 'チャットに問題が発生しました',
  chatErrorDescription:
    'チャットコンポーネントでエラーが発生しました。以下の操作で回復を試してください。',
  reloadChat: 'チャットを再読み込み',
  backToChatList: 'チャットリストに戻る',
  chatSeoDescription: 'AIアシスタントとチャット',

  // 補足の不足しているキー
  voiceTranscriptionFailed: '音声文字起こしに失敗しました',
  voiceTranscriptionError: '音声文字起こしに失敗しました。もう一度試してください',
  conversation: '会話',
  askAnything: '何でも質問してください',
  speak: '話す',
  search: '検索',
  tasks: 'タスク',
  companions: 'アシスタント',
  conversations: '会話',
  // Empty states
  emptyNewConversation: '新しい会話を開始',
  noMessages: 'メッセージはまだありません',

  // PC チャットパネル
  waitingForYou: 'ここで待っています',
  startChatPrompt: 'ノートの整理でもブレインストーミングでも、何でも話してください',
  writeMessage: '何か書いてください...',
  addFile: 'ファイルを追加',
  addContext: 'コンテキストを追加',
  searchDocs: 'ドキュメントを検索...',
  switchModel: 'モデルを切り替え',
  configureModel: 'モデルを設定',
  stopGenerating: '生成を停止',
  removeReference: '参照を削除',
  removeFile: 'Remove file',
  usedContext: '{{percent}}% {{used}} / {{total}} コンテキスト使用済み',
  searchCommands: 'コマンドを検索またはキーワードを入力...',
  preparing: '準備中...',
  writeFailed: '書き込みに失敗しました',

  // チャットパネルヘッダー
  expand: '展開',
  collapse: '折りたたむ',
  deleteChat: 'チャットを削除',

  // PC チャット入力補足
  setupModelFirst: '先にAIモデルを設定してください',
  waitMoment: '準備中、お待ちください',
  maxRecordingReached: '最大録音時間に達しました、自動停止しました',
  startRecording: '録音開始',
  stopRecording: '録音停止',
  noModelFound: 'モデルが見つかりません',
  modelSettings: 'モデル設定',
  selectModel: 'モデルを選択',
  setupModel: 'モデルを設定',
  transcribing: '文字起こし中...',
  openedDocs: '開いているドキュメント',
  recentFiles: 'Recent',
  allFiles: 'All files',
  noRecentFiles: 'No recent files',
  notFound: '見つかりません',
  allDocsAdded: 'すべてのファイルが追加されました',
  noOpenDocs: 'ワークスペースにファイルがありません',
  upgrade: 'アップグレード',
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
  tasksCompleted: '{{total}}件中{{completed}}件完了',

  // Message
  thinkingText: '考え中...',

  // ========== AI Elements ==========
  // ツールステータス
  statusPreparing: '準備中',
  statusExecuting: '実行中',
  statusWaitingConfirmation: '確認待ち',
  statusConfirmed: '確認済み',
  statusCompleted: '完了',
  statusError: 'エラー',
  statusSkipped: 'スキップ',

  // Tool approval
  approvalRequired: 'Approval required',
  approvalRequestHint: 'Approve this tool call to continue.',
  approvalGranted: 'Approval granted',
  approveOnce: 'Approve once',
  approveAlways: 'Always allow',
  approvalFailed: 'Failed to approve tool',

  // ツールラベル
  parameters: 'パラメータ',
  errorLabel: 'エラー',
  resultLabel: '結果',

  // ツール操作
  fileWritten: 'ファイルに書き込みました',
  targetFile: '対象ファイル',
  contentTooLong:
    '内容が長すぎるため切り捨てられました。ローカルファイルで全文を確認してください。',
  outputTruncated: 'Output truncated',
  viewFullOutput: 'View full output',
  fullOutputPath: 'Full output path',
  fullOutputTitle: 'Full output',
  written: '書き込み済み',
  applyToFile: 'ファイルに適用',
  noTasks: 'タスクがありません',
  openFileFailed: 'Failed to open file',

  // 添付ファイル
  contextInjected: '注入済み',
  collapseInjection: '注入内容を折りたたむ',
  viewInjection: '注入内容を表示',
  contentTruncated: '内容が長すぎるため、添付ファイルが切り捨てられました',

  // MCP セレクター
  mcpServers: 'MCPサーバー',
  reconnectAllServers: 'すべてのサーバーに再接続',
  toolCount: '{{count}}個のツール',
  connecting: '接続中...',
  notConnected: '未接続',
  manageServer: 'このサーバーを管理',
  addMcpServer: 'MCPサーバーを追加',
} as const satisfies Record<keyof typeof en, string>;

export default ja;
