const de = {
  // 页面基础
  pageTitle: 'Notizen',
  pageDescription: 'Verwalten Sie Ihre Notizen mit KI-Features',

  // 基础操作
  newNote: 'Neue Notiz',
  deleteNote: 'Notiz löschen',
  editNote: 'Notiz bearbeiten',
  saveNote: 'Notiz speichern',
  shareNote: 'Notiz teilen',
  exportNote: 'Notiz exportieren',
  duplicateNote: 'Notiz duplizieren',
  share: 'Teilen',
  delete: 'Löschen',
  deleteNoteConfirm:
    'Möchten Sie diese Notiz wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.',

  // 文件夹管理
  folders: 'Ordner',
  newFolder: 'Neuer Ordner',
  editFolder: 'Ordner bearbeiten',
  deleteFolder: 'Ordner löschen',
  mergeFolders: 'Ordner zusammenführen',
  uncategorized: 'Nicht kategorisiert',
  folderName: 'Ordnername',

  // 笔记列表
  allNotes: 'Alle Notizen',
  recentNotes: 'Kürzliche Notizen',
  noNotes: 'Keine Notizen gefunden',
  noNotesInFolder: 'Keine Notizen in diesem Ordner',
  notesCount: '{count} Notizen',

  // 搜索和筛选
  searchNotes: 'Notizen suchen',
  searchPlaceholder: 'Notizen suchen...',
  searchResults: 'Suchergebnisse',
  clearSearch: 'Suche löschen',
  filterByTag: 'Nach Tag filtern',
  filterByType: 'Nach Typ filtern',
  noSearchResults: 'Keine Notizen für "{query}" gefunden',
  globalSearch: 'Globale Suche',

  // 编辑器
  untitled: 'Ohne Titel',
  title: 'Titel',
  content: 'Inhalt',
  addTitle: 'Titel hinzufügen...',
  startWriting: 'Schreiben beginnen...',
  wordCount: '{count} Wörter',

  // 批量操作
  selectAll: 'Alle auswählen',
  deselectAll: 'Alle abwählen',
  selectedCount: '{count} ausgewählt',
  batchDelete: 'Ausgewählte löschen',
  batchMove: 'Ausgewählte verschieben',
  batchTag: 'Ausgewählte taggen',

  // 音频功能
  recordAudio: 'Audio aufnehmen',
  stopRecording: 'Aufnahme stoppen',
  playAudio: 'Audio abspielen',
  pauseAudio: 'Audio pausieren',
  audioNote: 'Audio-Notiz',
  transcribing: 'Transkribieren...',
  transcriptionFailed: 'Transkription fehlgeschlagen',

  // AI功能
  aiSuggestions: 'KI-Vorschläge',
  suggestFolder: 'Ordner vorschlagen',
  smartOrganize: 'Smart organisieren',
  generateSummary: 'Zusammenfassung erstellen',
  fromChatMessage: 'Aus Chat-Nachricht',
  fromAudio: 'Aus Audio',
  confirmCreation: 'Erstellung bestätigen',
  previewNote: 'Notiz vorschau',

  // 笔记类型
  sourceTypes: {
    manual: 'Manuell',
    chat: 'Aus Chat',
    audio: 'Aus Audio',
    file: 'Aus Datei',
    web: 'Aus Web',
  },

  // 时间
  createdAt: 'Erstellt am',
  updatedAt: 'Aktualisiert am',
  lastModified: 'Zuletzt geändert {time}',

  // 确认对话框
  confirmDelete: 'Sind Sie sicher, dass Sie diese Notiz löschen möchten?',
  confirmDeleteMultiple: 'Sind Sie sicher, dass Sie {count} Notizen löschen möchten?',
  confirmDeleteFolder:
    'Sind Sie sicher, dass Sie diesen Ordner löschen möchten? Alle Notizen werden nach "Nicht kategorisiert" verschoben.',
  unsavedChanges: 'Sie haben ungespeicherte Änderungen. Möchten Sie sie speichern?',

  // 错误信息
  saveFailed: 'Speichern der Notiz fehlgeschlagen',
  loadFailed: 'Laden der Notiz fehlgeschlagen',
  deleteFailed: 'Löschen der Notiz fehlgeschlagen',
  exportFailed: 'Export der Notiz fehlgeschlagen',
  folderCreateFailed: 'Erstellen des Ordners fehlgeschlagen',
  folderUpdateFailed: 'Aktualisieren des Ordners fehlgeschlagen',
  folderDeleteFailed: 'Löschen des Ordners fehlgeschlagen',
  folderLoadFailed: 'Laden der Ordner fehlgeschlagen',
  audioRecordFailed: 'Audio-Aufnahme fehlgeschlagen',
  audioUploadFailed: 'Audio-Upload fehlgeschlagen',

  // 成功消息
  noteSaved: 'Notiz erfolgreich gespeichert',
  noteDeleted: 'Notiz erfolgreich gelöscht',
  notesDeleted: '{count} Notizen erfolgreich gelöscht',
  noteExported: 'Notiz erfolgreich exportiert',
  noteShared: 'Notiz erfolgreich geteilt',
  folderCreated: 'Ordner erfolgreich erstellt',
  folderUpdated: 'Ordner erfolgreich aktualisiert',
  folderDeleted: 'Ordner erfolgreich gelöscht',
  audioRecorded: 'Audio erfolgreich aufgenommen',
  noteFromAudio: 'Notiz aus Audio erfolgreich erstellt',

  // 空状态
  emptyState: {
    title: 'Noch keine Notizen',
    description: 'Erstellen Sie Ihre erste Notiz, um loszulegen',
    actionText: 'Notiz erstellen',
  },

  emptyFolder: {
    title: 'Dieser Ordner ist leer',
    description: 'Fügen Sie einige Notizen zu diesem Ordner hinzu',
    actionText: 'Notiz hinzufügen',
  },

  emptySearch: {
    title: 'Keine passenden Notizen',
    description: 'Versuchen Sie, Ihre Suchbegriffe anzupassen',
    actionText: 'Suche löschen',
  },

  // 键盘快捷键
  shortcuts: {
    newNote: 'Strg+N',
    saveNote: 'Strg+S',
    search: 'Strg+F',
    toggleEdit: 'Strg+E',
  },

  // 补充缺失的keys
  createFirstFolder: 'Klicken Sie auf die Schaltfläche oben, um Ihren ersten Ordner zu erstellen',
  noFolders: 'Noch keine Ordner',
  enterFolderName: 'Ordnername eingeben',
  done: 'Fertig',
  noteCount: '{{count}} Notizen',
  createNote: 'Notiz erstellen',
  selectFolder: 'Ordner auswählen',
  createFirstNote: 'Klicken Sie oben rechts, um Ihre erste Notiz zu erstellen',
  noteNotFound: 'Notiz nicht gefunden',
  noteDeletedMessage: 'Notiz gelöscht',
  noteDetail: 'Notizdetails',
  folderNotFound: 'Ordner nicht gefunden',

  // Note detail page
  back: 'Zurück',
  moreActions: 'Weitere Aktionen',
  moreFeaturesComing: 'Weitere Features kommen bald',
  saving: 'Speichern...',
  saved: 'Gespeichert',
  edited: 'Bearbeitet',
  createdTime: 'Erstellt',

  // Relative time
  justNow: 'Gerade eben',
  minutesAgo: 'vor {{count}} Minuten',
  hoursAgo: 'vor {{count}} Stunden',
  daysAgo: 'vor {{count}} Tagen',

  // Editor toolbar
  aiAssistant: 'KI-Assistent',
  insertImage: 'Bild einfügen',
  bold: 'Fett',
  italic: 'Kursiv',
  underline: 'Unterstrichen',
  strikethrough: 'Durchgestrichen',
  heading2: 'Überschrift 2',
  heading: 'Überschrift',
  bulletList: 'Aufzählungsliste',
  orderedList: 'Nummerierte Liste',
  task: 'Aufgabenliste',
  quote: 'Zitat',
  code: 'Code',
  inlineCode: 'Inline-Code',
  codeBlock: 'Codeblock',
  link: 'Link',
  insertLink: 'Link einfügen',
  enterLinkUrl: 'Link-URL eingeben',
  dismissKeyboard: 'Tastatur schließen',
  cancel: 'Abbrechen',
  confirm: 'Bestätigen',
  boldPlaceholder: 'Fetter Text',
  italicPlaceholder: 'Kursiver Text',
  strikePlaceholder: 'Durchgestrichener Text',
  inlineCodePlaceholder: 'Code',
  linkTextPlaceholder: 'Linktext',

  // AI Assistant
  aiInputPlaceholder: 'Anfrage eingeben...',
  aiComingSoon: 'KI-Funktionen kommen bald',
  aiProcessingError: 'KI-Verarbeitung fehlgeschlagen',

  // Image related
  needPhotoPermission: 'Zugriff auf Fotobibliothek erforderlich',
  imageInserted: 'Bild eingefügt',
  imagePickerError: 'Bildauswahl fehlgeschlagen',

  // Color options
  colorDefault: 'Standard',
  colorBlack: 'Schwarz',
  colorGray: 'Grau',
  colorRed: 'Rot',
  colorOrange: 'Orange',
  colorYellow: 'Gelb',
  colorGreen: 'Grün',
  colorBlue: 'Blau',
  colorPurple: 'Lila',
  colorNone: 'Keine',
  webLink: 'Web-Link',
  transcriptionFailedMessage: 'Sprachtranskription fehlgeschlagen. Original-Audio speichern?',
  duration: 'Dauer',
  audioFile: 'Audio-Datei',
} as const

export default de
