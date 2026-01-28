import en from './en';

const de = {
  newConversation: 'Neues Gespräch',
  deleteConversation: 'Gespräch löschen',
  clearHistory: 'Verlauf löschen',
  sendMessage: 'Nachricht senden',
  regenerate: 'Regenerieren',
  copy: 'Kopieren',
  copySuccess: 'In Zwischenablage kopiert',
  typing: 'Tippt...',
  thinking: 'Denkt nach...',
  messagePlaceholder: 'Nachricht eingeben...',
  attachFile: 'Datei anhängen',
  referenceNote: 'Notiz referenzieren',
  history: 'Verlauf',
  noHistory: 'Kein Gesprächsverlauf',
  // Fehlermeldungen
  sendFailed: 'Senden der Nachricht fehlgeschlagen',
  networkError: 'Netzwerkfehler, bitte überprüfen Sie Ihre Verbindung',
  serverError: 'Serverfehler, bitte versuchen Sie es später erneut',
  quotaExceeded: 'Kontingent überschritten',
  // Erfolgsmeldungen
  conversationDeleted: 'Gespräch gelöscht',
  conversationRenamed: 'Gespräch umbenannt',
  historyCleared: 'Verlauf gelöscht',
  messageDeleted: 'Nachricht gelöscht',
  renameFailed: 'Umbenennung fehlgeschlagen, bitte versuchen Sie es erneut',
  deleteFailed: 'Löschen fehlgeschlagen, bitte versuchen Sie es erneut',
  // Benutzeroberfläche und Dialoge
  renameConversationTitle: 'Gespräch umbenennen',
  deleteConfirmTitle: 'Löschbestätigung',
  deleteConfirmDescription:
    'Diese Aktion kann nicht rückgängig gemacht werden. Sind Sie sicher, dass Sie dieses Gespräch löschen möchten?',
  deleteConfirmWithTitle:
    'Sind Sie sicher, dass Sie das Gespräch "{{title}}" löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.',
  titleLabel: 'Titel',
  newTitlePlaceholder: 'Neuen Gesprächstitel eingeben',
  // Fehlergrenze
  chatErrorTitle: 'Chat hat ein Problem festgestellt',
  chatErrorDescription:
    'Entschuldigung, die Chat-Komponente hat einen Fehler festgestellt. Sie können die folgenden Aktionen versuchen, um zu wiederherstellen.',
  reloadChat: 'Chat neu laden',
  backToChatList: 'Zurück zur Chat-Liste',
  chatSeoDescription: 'Chat mit dem KI-Assistenten',

  // Ergänzende fehlende Schlüssel
  voiceTranscriptionFailed: 'Sprachtranskription fehlgeschlagen',
  voiceTranscriptionError: 'Sprachtranskription fehlgeschlagen, bitte versuchen Sie es erneut',
  conversation: 'Gespräch',
  askAnything: 'Fragen Sie alles',
  speak: 'Sprechen',
  search: 'Suchen',
  tasks: 'Aufgaben',
  companions: 'Assistenten',
  conversations: 'Gespräche',
  // Empty states
  emptyNewConversation: 'Neue Unterhaltung starten',
  noMessages: 'Noch keine Nachrichten',

  // PC Chat-Panel
  waitingForYou: 'Ich warte hier auf Sie',
  startChatPrompt: 'Teilen Sie Ihre Gedanken, ob Notizen organisieren oder Brainstorming',
  writeMessage: 'Schreiben Sie etwas...',
  addFile: 'Datei hinzufügen',
  addContext: 'Kontext hinzufügen',
  searchDocs: 'Dokumente suchen...',
  switchModel: 'Modell wechseln',
  configureModel: 'Modell konfigurieren',
  stopGenerating: 'Generierung stoppen',
  removeReference: 'Referenz entfernen',
  removeFile: 'Remove file',
  usedContext: '{{percent}}% {{used}} / {{total}} Kontext verwendet',
  searchCommands: 'Befehle suchen oder Stichwort eingeben...',
  preparing: 'Vorbereitung...',
  writeFailed: 'Schreiben fehlgeschlagen',

  // Chat-Panel-Header
  expand: 'Erweitern',
  collapse: 'Einklappen',
  deleteChat: 'Chat löschen',

  // PC Chat-Eingabe Ergänzung
  setupModelFirst: 'Bitte zuerst ein KI-Modell einrichten',
  waitMoment: 'Vorbereitung, bitte warten',
  maxRecordingReached: 'Maximale Aufnahmedauer erreicht, automatisch gestoppt',
  startRecording: 'Aufnahme starten',
  stopRecording: 'Aufnahme stoppen',
  noModelFound: 'Keine Modelle gefunden',
  modelSettings: 'Modelleinstellungen',
  selectModel: 'Modell auswählen',
  setupModel: 'Modell einrichten',
  transcribing: 'Transkribieren...',
  openedDocs: 'Geöffnete Dokumente',
  recentFiles: 'Recent',
  allFiles: 'All files',
  noRecentFiles: 'No recent files',
  notFound: 'Nicht gefunden',
  allDocsAdded: 'Alle Dateien wurden hinzugefügt',
  noOpenDocs: 'Keine Dateien im Workspace',
  upgrade: 'Upgrade',
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
  tasksCompleted: '{{completed}} von {{total}} Aufgaben erledigt',
  taskPanelIdle: 'Leerlauf',
  taskPanelAllCompleted: 'Alle Aufgaben abgeschlossen',
  taskPanelShowMore: 'Mehr anzeigen',
  taskPanelShowLess: 'Weniger anzeigen',
  taskPanelLoadFailed: 'Aufgaben konnten nicht geladen werden',

  // Message
  thinkingText: 'denkt nach...',

  // ========== AI Elements ==========
  // Tool-Status
  statusPreparing: 'Vorbereitung',
  statusExecuting: 'Ausführung',
  statusWaitingConfirmation: 'Warte auf Bestätigung',
  statusConfirmed: 'Bestätigt',
  statusCompleted: 'Abgeschlossen',
  statusError: 'Fehler',
  statusSkipped: 'Übersprungen',

  // Tool approval
  approvalRequired: 'Approval required',
  approvalRequestHint: 'Approve this tool call to continue.',
  approvalGranted: 'Approval granted',
  approveOnce: 'Approve once',
  approveAlways: 'Always allow',
  approvalFailed: 'Failed to approve tool',

  // Tool-Labels
  parameters: 'Parameter',
  errorLabel: 'Fehler',
  resultLabel: 'Ergebnis',

  // Tool-Aktionen
  fileWritten: 'Datei geschrieben',
  targetFile: 'Zieldatei',
  contentTooLong: 'Inhalt zu lang, gekürzt. Vollständige Version in lokaler Datei ansehen.',
  outputTruncated: 'Output truncated',
  viewFullOutput: 'View full output',
  fullOutputPath: 'Full output path',
  fullOutputTitle: 'Full output',
  written: 'Geschrieben',
  applyToFile: 'Auf Datei anwenden',
  noTasks: 'Keine Aufgaben',
  openFileFailed: 'Failed to open file',

  // Anhänge
  contextInjected: 'Eingefügt',
  collapseInjection: 'Einfügung einklappen',
  viewInjection: 'Einfügung anzeigen',
  contentTruncated: 'Inhalt zu lang, Anhang wurde gekürzt',

  // MCP-Auswahl
  mcpServers: 'MCP-Server',
  reconnectAllServers: 'Alle Server neu verbinden',
  toolCount: '{{count}} Tools',
  connecting: 'Verbinden...',
  notConnected: 'Nicht verbunden',
  manageServer: 'Diesen Server verwalten',
  addMcpServer: 'MCP-Server hinzufügen',
} as const satisfies Record<keyof typeof en, string>;

export default de;
