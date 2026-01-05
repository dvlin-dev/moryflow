const en = {
  // 页面基础
  pageTitle: 'Notes',
  pageDescription: 'Manage your notes with AI-powered features',

  // 基础操作
  newNote: 'New Note',
  deleteNote: 'Delete Note',
  editNote: 'Edit Note',
  saveNote: 'Save Note',
  shareNote: 'Share Note',
  exportNote: 'Export Note',
  duplicateNote: 'Duplicate Note',
  share: 'Share',
  delete: 'Delete',
  deleteNoteConfirm: 'Are you sure you want to delete this note? This action cannot be undone.',

  // 文件夹管理
  folders: 'Folders',
  newFolder: 'New Folder',
  editFolder: 'Edit Folder',
  deleteFolder: 'Delete Folder',
  mergeFolders: 'Merge Folders',
  uncategorized: 'Unfiled',
  folderName: 'Folder Name',

  // 笔记列表
  allNotes: 'All Notes',
  recentNotes: 'Recent Notes',
  noNotes: 'No notes found',
  noNotesInFolder: 'No notes in this folder',
  notesCount: '{count} notes',

  // 搜索和筛选
  searchNotes: 'Search Notes',
  searchPlaceholder: 'Search notes...',
  searchResults: 'Search Results',
  clearSearch: 'Clear Search',
  filterByTag: 'Filter by Tag',
  filterByType: 'Filter by Type',
  noSearchResults: 'No notes found for "{query}"',
  globalSearch: 'Global Search',

  // 编辑器
  untitled: 'Untitled',
  title: 'Title',
  content: 'Content',
  addTitle: 'Add a title...',
  startWriting: 'Start writing...',
  wordCount: '{count} words',

  // 批量操作
  selectAll: 'Select All',
  deselectAll: 'Deselect All',
  selectedCount: '{count} selected',
  batchDelete: 'Delete Selected',
  batchMove: 'Move Selected',
  batchTag: 'Tag Selected',

  // 音频功能
  recordAudio: 'Record Audio',
  stopRecording: 'Stop Recording',
  playAudio: 'Play Audio',
  pauseAudio: 'Pause Audio',
  audioNote: 'Audio Note',
  transcribing: 'Transcribing...',
  transcriptionFailed: 'Transcription failed',

  // AI功能
  aiSuggestions: 'AI Suggestions',
  suggestFolder: 'Suggest Folder',
  smartOrganize: 'Smart Organize',
  generateSummary: 'Generate Summary',
  fromChatMessage: 'From Chat Message',
  fromAudio: 'From Audio',
  confirmCreation: 'Confirm Creation',
  previewNote: 'Preview Note',

  // 笔记类型
  sourceTypes: {
    manual: 'Manual',
    chat: 'From Chat',
    audio: 'From Audio',
    file: 'From File',
    web: 'From Web',
  },

  // 时间
  createdAt: 'Created At',
  updatedAt: 'Updated At',
  lastModified: 'Last modified {time}',

  // 确认对话框
  confirmDelete: 'Are you sure you want to delete this note?',
  confirmDeleteMultiple: 'Are you sure you want to delete {count} notes?',
  confirmDeleteFolder:
    'Are you sure you want to delete this folder? All notes will be moved to Unfiled.',
  unsavedChanges: 'You have unsaved changes. Do you want to save them?',

  // 错误信息
  saveFailed: 'Failed to save note',
  loadFailed: 'Failed to load note',
  deleteFailed: 'Failed to delete note',
  exportFailed: 'Failed to export note',
  folderCreateFailed: 'Failed to create folder',
  folderUpdateFailed: 'Failed to update folder',
  folderDeleteFailed: 'Failed to delete folder',
  folderLoadFailed: 'Failed to load folders',
  audioRecordFailed: 'Failed to record audio',
  audioUploadFailed: 'Failed to upload audio',

  // 成功消息
  noteSaved: 'Note saved successfully',
  noteDeleted: 'Note deleted successfully',
  notesDeleted: '{count} notes deleted successfully',
  noteExported: 'Note exported successfully',
  noteShared: 'Note shared successfully',
  folderCreated: 'Folder created successfully',
  folderUpdated: 'Folder updated successfully',
  folderDeleted: 'Folder deleted successfully',
  audioRecorded: 'Audio recorded successfully',
  noteFromAudio: 'Note created from audio successfully',

  // 空状态
  emptyState: {
    title: 'No notes yet',
    description: 'Create your first note to get started',
    actionText: 'Create Note',
  },

  emptyFolder: {
    title: 'This folder is empty',
    description: 'Add some notes to this folder',
    actionText: 'Add Note',
  },

  emptySearch: {
    title: 'No matching notes',
    description: 'Try adjusting your search terms',
    actionText: 'Clear Search',
  },

  // 键盘快捷键
  shortcuts: {
    newNote: 'Ctrl+N',
    saveNote: 'Ctrl+S',
    search: 'Ctrl+F',
    toggleEdit: 'Ctrl+E',
  },

  // 补充缺失的keys
  createFirstFolder: 'Click the button above to create your first folder',
  noFolders: 'No folders yet',
  enterFolderName: 'Enter folder name',
  done: 'Done',
  noteCount: '{{count}} notes',
  createNote: 'Create Note',
  selectFolder: 'Select Folder',
  createFirstNote: 'Click the top-right corner to create your first note',
  noteNotFound: 'Note not found',
  noteDeletedMessage: 'Note deleted',
  noteDetail: 'Note Details',
  folderNotFound: 'Folder not found',

  // Note detail page
  back: 'Back',
  moreActions: 'More Actions',
  moreFeaturesComing: 'More features coming soon',
  saving: 'Saving...',
  saved: 'Saved',
  edited: 'Edited',
  createdTime: 'Created',

  // Relative time
  justNow: 'Just now',
  minutesAgo: '{{count}} minutes ago',
  hoursAgo: '{{count}} hours ago',
  daysAgo: '{{count}} days ago',

  // Editor toolbar
  aiAssistant: 'AI Assistant',
  insertImage: 'Insert Image',
  bold: 'Bold',
  italic: 'Italic',
  underline: 'Underline',
  strikethrough: 'Strikethrough',
  heading2: 'Heading 2',
  heading: 'Heading',
  bulletList: 'Bullet List',
  orderedList: 'Ordered List',
  task: 'Task list',
  quote: 'Quote',
  code: 'Code',
  inlineCode: 'Inline code',
  codeBlock: 'Code block',
  link: 'Link',
  insertLink: 'Insert Link',
  enterLinkUrl: 'Enter link URL',
  dismissKeyboard: 'Dismiss Keyboard',
  cancel: 'Cancel',
  confirm: 'Confirm',
  boldPlaceholder: 'bold text',
  italicPlaceholder: 'italic text',
  strikePlaceholder: 'strikethrough text',
  inlineCodePlaceholder: 'code',
  linkTextPlaceholder: 'link text',

  // AI Assistant
  aiInputPlaceholder: 'Enter your request...',
  aiComingSoon: 'AI features coming soon',
  aiProcessingError: 'AI processing failed',

  // Image related
  needPhotoPermission: 'Photo library permission required',
  imageInserted: 'Image inserted',
  imagePickerError: 'Failed to select image',

  // Color options
  colorDefault: 'Default',
  colorBlack: 'Black',
  colorGray: 'Gray',
  colorRed: 'Red',
  colorOrange: 'Orange',
  colorYellow: 'Yellow',
  colorGreen: 'Green',
  colorBlue: 'Blue',
  colorPurple: 'Purple',
  colorNone: 'None',
  webLink: 'Web Link',
  transcriptionFailedMessage: 'Voice transcription failed. Save original audio?',
  duration: 'Duration',
  audioFile: 'Audio File',
} as const

export default en
