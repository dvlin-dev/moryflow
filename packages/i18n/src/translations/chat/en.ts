const en = {
  newConversation: 'New Conversation',
  deleteConversation: 'Delete Conversation',
  clearHistory: 'Clear History',
  sendMessage: 'Send Message',
  regenerate: 'Regenerate',
  copy: 'Copy',
  copySuccess: 'Copied to clipboard',
  typing: 'Typing...',
  thinking: 'Thinking...',
  messagePlaceholder: 'Type your message...',
  attachFile: 'Attach File',
  referenceNote: 'Reference Note',
  history: 'History',
  noHistory: 'No conversation history',
  // 错误信息
  sendFailed: 'Failed to send message',
  networkError: 'Network error, please check your connection',
  serverError: 'Server error, please try again later',
  quotaExceeded: 'Quota exceeded',
  // 成功消息
  conversationDeleted: 'Conversation deleted',
  conversationRenamed: 'Conversation renamed',
  historyCleared: 'History cleared',
  messageDeleted: 'Message deleted',
  renameFailed: 'Rename failed, please try again',
  deleteFailed: 'Delete failed, please try again',
  // 界面与对话框
  renameConversationTitle: 'Rename Conversation',
  deleteConfirmTitle: 'Delete Confirmation',
  deleteConfirmDescription:
    'This action cannot be undone. Are you sure you want to delete this conversation?',
  deleteConfirmWithTitle:
    'Are you sure you want to delete conversation "{{title}}"? This action cannot be undone.',
  titleLabel: 'Title',
  newTitlePlaceholder: 'Enter new conversation title',
  // 错误边界
  chatErrorTitle: 'Chat encountered a problem',
  chatErrorDescription:
    'Sorry, the chat component has encountered an error. You can try the following actions to recover.',
  reloadChat: 'Reload Chat',
  backToChatList: 'Back to chat list',
  chatSeoDescription: 'Chat with the AI assistant',

  // 补充缺失的keys
  voiceTranscriptionFailed: 'Voice transcription failed',
  voiceTranscriptionError: 'Voice transcription failed, please try again',
  conversation: 'Conversation',
  askAnything: 'Ask Anything',
  speak: 'Speak',
  search: 'Search',
  tasks: 'Tasks',
  companions: 'Companions',
  conversations: 'Conversations',
  // Empty states
  emptyNewConversation: 'Start a new conversation',
  noMessages: 'No messages yet',

  // PC 聊天面板
  waitingForYou: "I'm here waiting",
  startChatPrompt: 'Share your thoughts, whether organizing notes or brainstorming',
  writeMessage: 'Write something...',
  addFile: 'Add File',
  addContext: 'Add Context',
  searchDocs: 'Search documents...',
  switchModel: 'Switch Model',
  configureModel: 'Configure Model',
  stopGenerating: 'Stop Generating',
  removeReference: 'Remove Reference',
  usedContext: '{{percent}}% {{used}} / {{total}} context used',
  searchCommands: 'Search commands or enter keyword...',
  preparing: 'Preparing...',
  writeFailed: 'Write failed',

  // Chat panel header
  expand: 'Expand',
  collapse: 'Collapse',
  deleteChat: 'Delete Chat',

  // Additional PC chat input
  setupModelFirst: 'Set up an AI model first',
  waitMoment: 'Preparing, please wait',
  maxRecordingReached: 'Maximum recording duration reached, stopped automatically',
  startRecording: 'Start recording',
  stopRecording: 'Stop recording',
  noModelFound: 'No models found',
  modelSettings: 'Model Settings',
  selectModel: 'Select Model',
  setupModel: 'Set up Model',
  transcribing: 'Transcribing...',
  openedDocs: 'Opened Documents',
  notFound: 'Not found',
  allDocsAdded: 'All files have been added',
  noOpenDocs: 'No files in workspace',
  upgrade: 'Upgrade',

  // Todo panel
  tasksCompleted: '{{completed}} of {{total}} tasks completed',

  // Message
  thinkingText: 'thinking...',

  // ========== AI Elements ==========
  // Tool status labels
  statusPreparing: 'Preparing',
  statusExecuting: 'Executing',
  statusWaitingConfirmation: 'Waiting Confirmation',
  statusConfirmed: 'Confirmed',
  statusCompleted: 'Completed',
  statusError: 'Error',
  statusSkipped: 'Skipped',

  // Tool labels
  parameters: 'Parameters',
  errorLabel: 'Error',
  resultLabel: 'Result',

  // Tool actions
  fileWritten: 'File written',
  targetFile: 'Target file',
  contentTooLong: 'Content too long, truncated. See full version in local file.',
  outputTruncated: 'Output truncated',
  viewFullOutput: 'View full output',
  fullOutputPath: 'Full output path',
  fullOutputTitle: 'Full output',
  written: 'Written',
  applyToFile: 'Apply to file',
  noTasks: 'No tasks',
  openFileFailed: 'Failed to open file',

  // Attachments
  contextInjected: 'Injected',
  collapseInjection: 'Collapse injection',
  viewInjection: 'View injection',
  contentTruncated: 'Content too long, attachment has been truncated',

  // MCP Selector
  mcpServers: 'MCP Servers',
  reconnectAllServers: 'Reconnect all servers',
  toolCount: '{{count}} tools',
  connecting: 'Connecting...',
  notConnected: 'Not connected',
  manageServer: 'Manage this server',
  addMcpServer: 'Add MCP Server',
} as const;

export default en;
