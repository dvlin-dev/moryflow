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
  notFound: 'Nicht gefunden',
  allDocsAdded: 'Alle Dateien wurden hinzugefügt',
  noOpenDocs: 'Keine Dateien im Workspace',
  upgrade: 'Upgrade',

  // Todo panel
  tasksCompleted: '{{completed}} von {{total}} Aufgaben erledigt',

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

  // Tool-Labels
  parameters: 'Parameter',
  errorLabel: 'Fehler',
  resultLabel: 'Ergebnis',

  // Tool-Aktionen
  fileWritten: 'Datei geschrieben',
  targetFile: 'Zieldatei:',
  contentTooLong: 'Inhalt zu lang, gekürzt. Vollständige Version in lokaler Datei ansehen.',
  written: 'Geschrieben',
  applyToFile: 'Auf Datei anwenden',
  noTasks: 'Keine Aufgaben',

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
