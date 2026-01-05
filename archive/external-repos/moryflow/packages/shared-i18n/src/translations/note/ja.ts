const ja = {
  // 页面基础
  pageTitle: 'ノート',
  pageDescription: 'AI機能でノートを管理する',

  // 基础操作
  newNote: '新しいノート',
  deleteNote: 'ノートを削除',
  editNote: 'ノートを編集',
  saveNote: 'ノートを保存',
  shareNote: 'ノートを共有',
  exportNote: 'ノートをエクスポート',
  duplicateNote: 'ノートを複製',
  share: '共有',
  delete: '削除',
  deleteNoteConfirm: 'このノートを削除してもよろしいですか？この操作は取り消せません。',

  // 文件夹管理
  folders: 'フォルダー',
  newFolder: '新しいフォルダー',
  editFolder: 'フォルダーを編集',
  deleteFolder: 'フォルダーを削除',
  mergeFolders: 'フォルダーを統合',
  uncategorized: '未分類',
  folderName: 'フォルダー名',

  // 笔记列表
  allNotes: 'すべてのノート',
  recentNotes: '最近のノート',
  noNotes: 'ノートが見つかりません',
  noNotesInFolder: 'このフォルダーにノートがありません',
  notesCount: '{count}件のノート',

  // 搜索和筛选
  searchNotes: 'ノートを検索',
  searchPlaceholder: 'ノートを検索...',
  searchResults: '検索結果',
  clearSearch: '検索をクリア',
  filterByTag: 'タグで絞り込み',
  filterByType: 'タイプで絞り込み',
  noSearchResults: '"{query}"のノートが見つかりません',
  globalSearch: 'グローバル検索',

  // 编辑器
  untitled: '無題',
  title: 'タイトル',
  content: 'コンテンツ',
  addTitle: 'タイトルを追加...',
  startWriting: '書き始める...',
  wordCount: '{count}文字',

  // 批量操作
  selectAll: 'すべて選択',
  deselectAll: 'すべて選択解除',
  selectedCount: '{count}件選択',
  batchDelete: '選択項目を削除',
  batchMove: '選択項目を移動',
  batchTag: '選択項目にタグ付け',

  // 音频功能
  recordAudio: '音声を録音',
  stopRecording: '録音停止',
  playAudio: '音声を再生',
  pauseAudio: '音声を一時停止',
  audioNote: '音声ノート',
  transcribing: '文字起こし中...',
  transcriptionFailed: '文字起こしに失敗しました',

  // AI功能
  aiSuggestions: 'AI提案',
  suggestFolder: 'フォルダーを提案',
  smartOrganize: 'スマート整理',
  generateSummary: '要約を生成',
  fromChatMessage: 'チャットメッセージから',
  fromAudio: '音声から',
  confirmCreation: '作成を確認',
  previewNote: 'ノートをプレビュー',

  // 笔记类型
  sourceTypes: {
    manual: '手動',
    chat: 'チャットから',
    audio: '音声から',
    file: 'ファイルから',
    web: 'ウェブから',
  },

  // 时间
  createdAt: '作成日時',
  updatedAt: '更新日時',
  lastModified: '最終更新 {time}',

  // 确认对话框
  confirmDelete: 'このノートを削除してもよろしいですか？',
  confirmDeleteMultiple: '{count}件のノートを削除してもよろしいですか？',
  confirmDeleteFolder:
    'このフォルダーを削除してもよろしいですか？すべてのノートは未分類に移動されます。',
  unsavedChanges: '未保存の変更があります。保存しますか？',

  // 错误信息
  saveFailed: 'ノートの保存に失敗しました',
  loadFailed: 'ノートの読み込みに失敗しました',
  deleteFailed: 'ノートの削除に失敗しました',
  exportFailed: 'ノートのエクスポートに失敗しました',
  folderCreateFailed: 'フォルダーの作成に失敗しました',
  folderUpdateFailed: 'フォルダーの更新に失敗しました',
  folderDeleteFailed: 'フォルダーの削除に失敗しました',
  folderLoadFailed: 'フォルダーの読み込みに失敗しました',
  audioRecordFailed: '音声の録音に失敗しました',
  audioUploadFailed: '音声のアップロードに失敗しました',

  // 成功消息
  noteSaved: 'ノートが正常に保存されました',
  noteDeleted: 'ノートが正常に削除されました',
  notesDeleted: '{count}件のノートが正常に削除されました',
  noteExported: 'ノートが正常にエクスポートされました',
  noteShared: 'ノートが正常に共有されました',
  folderCreated: 'フォルダーが正常に作成されました',
  folderUpdated: 'フォルダーが正常に更新されました',
  folderDeleted: 'フォルダーが正常に削除されました',
  audioRecorded: '音声が正常に録音されました',
  noteFromAudio: '音声からノートが正常に作成されました',

  // 空状态
  emptyState: {
    title: 'まだノートがありません',
    description: '最初のノートを作成して始めましょう',
    actionText: 'ノートを作成',
  },

  emptyFolder: {
    title: 'このフォルダーは空です',
    description: 'このフォルダーにノートを追加してください',
    actionText: 'ノートを追加',
  },

  emptySearch: {
    title: '一致するノートがありません',
    description: '検索条件を調整してみてください',
    actionText: '検索をクリア',
  },

  // 键盘快捷键
  shortcuts: {
    newNote: 'Ctrl+N',
    saveNote: 'Ctrl+S',
    search: 'Ctrl+F',
    toggleEdit: 'Ctrl+E',
  },

  // 补充缺失的keys
  createFirstFolder: '上のボタンをクリックして最初のフォルダーを作成',
  noFolders: 'まだフォルダーがありません',
  enterFolderName: 'フォルダー名を入力',
  done: '完了',
  noteCount: '{{count}}件のノート',
  createNote: 'ノートを作成',
  selectFolder: 'フォルダーを選択',
  createFirstNote: '右上隅をクリックして最初のノートを作成',
  noteNotFound: 'ノートが見つかりません',
  noteDeletedMessage: 'ノートが削除されました',
  noteDetail: 'ノートの詳細',
  folderNotFound: 'フォルダーが見つかりません',

  // Note detail page
  back: '戻る',
  moreActions: 'その他のアクション',
  moreFeaturesComing: 'より多くの機能が近日公開',
  saving: '保存中...',
  saved: '保存済み',
  edited: '編集済み',
  createdTime: '作成日時',

  // Relative time
  justNow: 'たった今',
  minutesAgo: '{{count}}分前',
  hoursAgo: '{{count}}時間前',
  daysAgo: '{{count}}日前',

  // Editor toolbar
  aiAssistant: 'AIアシスタント',
  insertImage: '画像を挿入',
  bold: '太字',
  italic: '斜体',
  underline: '下線',
  strikethrough: '取り消し線',
  heading2: '見出し2',
  heading: '見出し',
  bulletList: '箇条書き',
  orderedList: '番号付きリスト',
  task: 'タスクリスト',
  quote: '引用',
  code: 'コード',
  inlineCode: 'インラインコード',
  codeBlock: 'コードブロック',
  link: 'リンク',
  insertLink: 'リンクを挿入',
  enterLinkUrl: 'リンクURLを入力',
  dismissKeyboard: 'キーボードを閉じる',
  cancel: 'キャンセル',
  confirm: '確認',
  boldPlaceholder: '太字テキスト',
  italicPlaceholder: '斜体テキスト',
  strikePlaceholder: '取り消し線テキスト',
  inlineCodePlaceholder: 'コード',
  linkTextPlaceholder: 'リンクテキスト',

  // AI Assistant
  aiInputPlaceholder: 'リクエストを入力...',
  aiComingSoon: 'AI機能は近日公開',
  aiProcessingError: 'AI処理に失敗しました',

  // Image related
  needPhotoPermission: 'フォトライブラリのアクセス許可が必要です',
  imageInserted: '画像を挿入しました',
  imagePickerError: '画像の選択に失敗しました',

  // Color options
  colorDefault: 'デフォルト',
  colorBlack: '黒',
  colorGray: 'グレー',
  colorRed: '赤',
  colorOrange: 'オレンジ',
  colorYellow: '黄',
  colorGreen: '緑',
  colorBlue: '青',
  colorPurple: '紫',
  colorNone: 'なし',
  webLink: 'ウェブリンク',
  transcriptionFailedMessage: '音声転写に失敗しました。元の音声を保存しますか？',
  duration: '再生時間',
  audioFile: '音声ファイル',
} as const

export default ja
