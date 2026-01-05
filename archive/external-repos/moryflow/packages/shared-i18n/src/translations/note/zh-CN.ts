import en from './en'

const zhCN = {
  // 页面基础
  pageTitle: '笔记',
  pageDescription: '使用 AI 功能管理您的笔记',

  // 基础操作
  newNote: '新建笔记',
  deleteNote: '删除笔记',
  editNote: '编辑笔记',
  saveNote: '保存笔记',
  shareNote: '分享笔记',
  exportNote: '导出笔记',
  duplicateNote: '复制笔记',
  share: '分享',
  delete: '删除',
  deleteNoteConfirm: '确定要删除这条笔记吗？此操作不可恢复。',

  // 文件夹管理
  folders: '文件夹',
  newFolder: '新建文件夹',
  editFolder: '编辑文件夹',
  deleteFolder: '删除文件夹',
  mergeFolders: '合并文件夹',
  uncategorized: '未归档',
  folderName: '文件夹名称',

  // 笔记列表
  allNotes: '全部笔记',
  recentNotes: '最近笔记',
  noNotes: '暂无笔记',
  noNotesInFolder: '该文件夹下暂无笔记',
  notesCount: '{count} 条笔记',

  // 搜索和筛选
  searchNotes: '搜索笔记',
  searchPlaceholder: '搜索笔记...',
  searchResults: '搜索结果',
  clearSearch: '清除搜索',
  filterByTag: '按标签筛选',
  filterByType: '按类型筛选',
  noSearchResults: '未找到与 "{query}" 相关的笔记',
  globalSearch: '全局搜索',

  // 编辑器
  untitled: '无标题',
  title: '标题',
  content: '内容',
  addTitle: '添加标题...',
  startWriting: '开始写作...',
  wordCount: '{count} 字',

  // 批量操作
  selectAll: '全选',
  deselectAll: '取消全选',
  selectedCount: '已选择 {count} 条',
  batchDelete: '删除选中',
  batchMove: '移动选中',
  batchTag: '标签选中',

  // 音频功能
  recordAudio: '录制音频',
  stopRecording: '停止录制',
  playAudio: '播放音频',
  pauseAudio: '暂停音频',
  audioNote: '音频笔记',
  transcribing: '正在转写...',
  transcriptionFailed: '转写失败',

  // AI功能
  aiSuggestions: 'AI 建议',
  suggestFolder: '建议文件夹',
  smartOrganize: '智能整理',
  generateSummary: '生成摘要',
  fromChatMessage: '来自聊天消息',
  fromAudio: '来自音频',
  confirmCreation: '确认创建',
  previewNote: '预览笔记',

  // 笔记类型
  sourceTypes: {
    manual: '手动创建',
    chat: '来自聊天',
    audio: '来自音频',
    file: '来自文件',
    web: '来自网页',
  },

  // 时间
  createdAt: '创建时间',
  updatedAt: '更新时间',
  lastModified: '最后修改 {time}',

  // 确认对话框
  confirmDelete: '确定要删除这条笔记吗？',
  confirmDeleteMultiple: '确定要删除 {count} 条笔记吗？',
  confirmDeleteFolder: '确定要删除这个文件夹吗？所有笔记将移动到未归档。',
  unsavedChanges: '您有未保存的更改，是否要保存？',

  // 错误信息
  saveFailed: '保存笔记失败',
  loadFailed: '加载笔记失败',
  deleteFailed: '删除笔记失败',
  exportFailed: '导出笔记失败',
  folderCreateFailed: '创建文件夹失败',
  folderUpdateFailed: '更新文件夹失败',
  folderDeleteFailed: '删除文件夹失败',
  folderLoadFailed: '加载文件夹失败',
  audioRecordFailed: '录制音频失败',
  audioUploadFailed: '上传音频失败',

  // 成功消息
  noteSaved: '笔记保存成功',
  noteDeleted: '笔记删除成功',
  notesDeleted: '成功删除 {count} 条笔记',
  noteExported: '笔记导出成功',
  noteShared: '笔记分享成功',
  folderCreated: '文件夹创建成功',
  folderUpdated: '文件夹更新成功',
  folderDeleted: '文件夹删除成功',
  audioRecorded: '音频录制成功',
  noteFromAudio: '音频笔记创建成功',

  // 空状态
  emptyState: {
    title: '暂无笔记',
    description: '创建您的第一条笔记开始使用',
    actionText: '创建笔记',
  },

  emptyFolder: {
    title: '该文件夹为空',
    description: '向此文件夹添加一些笔记',
    actionText: '添加笔记',
  },

  emptySearch: {
    title: '未找到匹配的笔记',
    description: '试试调整搜索关键词',
    actionText: '清除搜索',
  },

  // 键盘快捷键
  shortcuts: {
    newNote: 'Ctrl+N',
    saveNote: 'Ctrl+S',
    search: 'Ctrl+F',
    toggleEdit: 'Ctrl+E',
  },

  // 补充缺失的keys
  createFirstFolder: '点击上方按钮创建第一个文件夹',
  noFolders: '暂无文件夹',
  enterFolderName: '输入文件夹名称',
  done: '完成',
  noteCount: '{{count}} 个笔记',
  createNote: '创建笔记',
  selectFolder: '选择文件夹',
  createFirstNote: '点击右上角创建第一个笔记',
  noteNotFound: '笔记不存在',
  noteDeletedMessage: '笔记已删除',
  noteDetail: '笔记详情',
  folderNotFound: '文件夹不存在',

  // 笔记详情页面
  back: '返回',
  moreActions: '更多操作',
  moreFeaturesComing: '更多功能即将推出',
  saving: '正在保存...',
  saved: '已保存',
  edited: '已编辑',
  createdTime: '创建于',

  // 相对时间
  justNow: '刚刚',
  minutesAgo: '{{count}}分钟前',
  hoursAgo: '{{count}}小时前',
  daysAgo: '{{count}}天前',

  // 编辑器工具栏
  aiAssistant: 'AI 助手',
  insertImage: '插入图片',
  bold: '加粗',
  italic: '斜体',
  underline: '下划线',
  strikethrough: '删除线',
  heading2: '二级标题',
  heading: '标题',
  bulletList: '无序列表',
  orderedList: '有序列表',
  task: '任务列表',
  quote: '引用',
  code: '代码',
  inlineCode: '行内代码',
  codeBlock: '代码块',
  link: '链接',
  insertLink: '插入链接',
  enterLinkUrl: '输入链接地址',
  dismissKeyboard: '收起键盘',
  cancel: '取消',
  confirm: '确认',
  boldPlaceholder: '粗体文本',
  italicPlaceholder: '斜体文本',
  strikePlaceholder: '删除线文本',
  inlineCodePlaceholder: '代码',
  linkTextPlaceholder: '链接文本',

  // AI 助手
  aiInputPlaceholder: '输入您的需求...',
  aiComingSoon: 'AI 功能即将推出',
  aiProcessingError: 'AI 处理失败',

  // 图片相关
  needPhotoPermission: '需要相册权限',
  imageInserted: '图片已插入',
  imagePickerError: '选择图片失败',

  // 颜色选项
  colorDefault: '默认',
  colorBlack: '黑色',
  colorGray: '灰色',
  colorRed: '红色',
  colorOrange: '橙色',
  colorYellow: '黄色',
  colorGreen: '绿色',
  colorBlue: '蓝色',
  colorPurple: '紫色',
  colorNone: '无',
  webLink: '网页链接',
  transcriptionFailedMessage: '语音转文字失败，是否保存原始音频？',
  duration: '时长',
  audioFile: '音频文件',
} as const satisfies Record<keyof typeof en, any>

export default zhCN
