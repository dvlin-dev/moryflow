import en from './en';

const zhCN = {
  newConversation: '新会话',
  deleteConversation: '删除会话',
  clearHistory: '清空历史',
  sendMessage: '发送消息',
  regenerate: '重新生成',
  copy: '复制',
  copySuccess: '已复制到剪贴板',
  typing: '正在输入...',
  thinking: '思考中...',
  messagePlaceholder: '输入您的消息...',
  attachFile: '附加文件',
  referenceNote: '引用笔记',
  history: '历史记录',
  noHistory: '暂无历史记录',
  // 错误信息
  sendFailed: '发送消息失败',
  networkError: '网络错误，请检查您的连接',
  serverError: '服务器错误，请稍后重试',
  quotaExceeded: '已超出配额',
  // 成功消息
  conversationDeleted: '会话已删除',
  conversationRenamed: '会话已重命名',
  historyCleared: '历史已清空',
  messageDeleted: '消息已删除',
  renameFailed: '重命名失败，请重试',
  deleteFailed: '删除失败，请重试',
  // 界面与对话框
  renameConversationTitle: '重命名对话',
  deleteConfirmTitle: '确认删除',
  deleteConfirmDescription: '此操作无法撤销。确定要删除这个对话吗？',
  deleteConfirmWithTitle: '确定要删除对话“{{title}}”吗？此操作无法撤销。',
  titleLabel: '标题',
  newTitlePlaceholder: '请输入新的对话标题',
  // 错误边界
  chatErrorTitle: '聊天功能遇到问题',
  chatErrorDescription: '抱歉，聊天组件出现了错误。您可以尝试以下操作来恢复。',
  reloadChat: '重新加载聊天',
  backToChatList: '返回聊天列表',
  chatSeoDescription: '与 AI 助手进行智能对话',

  // 补充缺失的keys
  voiceTranscriptionFailed: '语音转写失败',
  voiceTranscriptionError: '语音转写失败，请重试',
  conversation: '对话',
  askAnything: '请问何事...',
  speak: '语音',
  search: '搜索',
  tasks: '任务',
  companions: '助手',
  conversations: '对话列表',
  // Empty states
  emptyNewConversation: '开始新的对话',
  noMessages: '暂无消息',

  // PC 聊天面板
  waitingForYou: '我在这儿候着呢',
  startChatPrompt: '有什么想法尽管说，不管是整理笔记还是头脑风暴',
  writeMessage: '写点什么…',
  addFile: '添加文件',
  addContext: '添加背景信息',
  searchDocs: '搜索文档...',
  switchModel: '切换模型',
  configureModel: '配置模型',
  stopGenerating: '停止生成',
  removeReference: '移除引用',
  usedContext: '{{percent}}% {{used}} / {{total}} 已使用上下文',
  searchCommands: '搜索命令或输入关键字…',
  preparing: '准备中…',
  writeFailed: '写入失败',

  // 聊天面板头部
  expand: '展开',
  collapse: '收起',
  deleteChat: '删除对话',

  // PC 聊天输入补充
  setupModelFirst: '先设置一个 AI 模型',
  waitMoment: '准备中，稍等',
  maxRecordingReached: '已达到最大录音时长，自动停止',
  startRecording: '开始录音',
  stopRecording: '停止录音',
  noModelFound: '没找到模型',
  modelSettings: '模型设置',
  selectModel: '选择模型',
  setupModel: '设置模型',
  transcribing: '转录中...',
  openedDocs: '已打开的文档',
  notFound: '没找到',
  allDocsAdded: '所有文件都已添加',
  noOpenDocs: '工作区没有文件',
  upgrade: '升级',

  // Todo panel
  tasksCompleted: '已完成 {{completed}}/{{total}} 个任务',

  // Message
  thinkingText: '思考中...',

  // ========== AI Elements ==========
  // 工具状态
  statusPreparing: '准备中',
  statusExecuting: '执行中',
  statusWaitingConfirmation: '等待确认',
  statusConfirmed: '已确认',
  statusCompleted: '完成',
  statusError: '出错了',
  statusSkipped: '已跳过',

  // 工具标签
  parameters: '参数',
  errorLabel: '错误',
  resultLabel: '结果',

  // 工具操作
  fileWritten: '已写入文件',
  targetFile: '目标文件',
  contentTooLong: '内容太长，已截断，在本地文件查看完整版。',
  outputTruncated: 'Output truncated',
  viewFullOutput: 'View full output',
  fullOutputPath: 'Full output path',
  fullOutputTitle: 'Full output',
  written: '已写入',
  applyToFile: '应用到文件',
  noTasks: '暂无任务',
  openFileFailed: 'Failed to open file',

  // 附件
  contextInjected: '已注入',
  collapseInjection: '收起注入内容',
  viewInjection: '查看注入内容',
  contentTruncated: '内容过长，附件已截断',

  // MCP 选择器
  mcpServers: 'MCP 服务器',
  reconnectAllServers: '重新连接所有服务器',
  toolCount: '{{count}} 个工具',
  connecting: '连接中...',
  notConnected: '未连接',
  manageServer: '管理此服务器',
  addMcpServer: '添加 MCP 服务器',
} as const satisfies Record<keyof typeof en, string>;

export default zhCN;
