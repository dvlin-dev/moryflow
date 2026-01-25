import en from './en';

const de = {
  // Titel und Menüs
  settings: 'Einstellungen',
  cancel: 'Abbrechen',
  saveSettings: 'Einstellungen speichern',
  loading: 'Laden...',
  general: 'Allgemein',
  appearance: 'Erscheinungsbild',
  notifications: 'Benachrichtigungen',
  privacy: 'Datenschutz',
  security: 'Sicherheit',
  advanced: 'Erweitert',
  about: 'Über',
  version: 'Version',
  checkUpdate: 'Nach Updates suchen',
  reportBug: 'Fehler melden',
  feedback: 'Feedback',
  profile: 'Profil',
  preferences: 'Einstellungen',

  // Seitentitel und Beschreibungen
  profileDescription: 'Verwalten Sie Ihre persönlichen Informationen',
  securityDescription: 'Ändern Sie Ihr Passwort, um Ihr Konto zu sichern',
  preferencesDescription: 'Passen Sie Ihre Erfahrung an',
  verifyEmailTitle: 'E-Mail verifizieren',
  verifyEmailDescription: 'Geben Sie den an {email} gesendeten Bestätigungscode ein',

  // Profil
  username: 'Benutzername',
  email: 'E-Mail',
  emailCannotModify: 'E-Mail-Adresse kann nicht geändert werden',
  usernameSupports: 'Unterstützt Buchstaben, Zahlen, Unterstriche und Bindestriche',

  // Theme-Optionen
  theme: 'Theme',
  themeDescription: 'Wählen Sie Ihr bevorzugtes Interface-Theme',
  light: 'Hell',
  lightDescription: 'Helles Interface, geeignet für die Tagesnutzung',
  dark: 'Dunkel',
  darkDescription: 'Augenfreundliches dunkles Interface, geeignet für die Nachtnutzung',
  system: 'System folgen',
  systemDescription: 'Automatisches Umschalten, folgt den Systemeinstellungen',

  // Sprachoptionen
  language: 'Sprache',
  languageDescription: 'Interface-Anzeigesprache auswählen',
  english: 'Englisch',
  simplifiedChinese: 'Vereinfachtes Chinesisch',
  languageFeatureInDevelopment:
    'Hinweis: Die Sprachumschaltfunktion ist in Entwicklung, erscheint bald',
  selectLanguage: 'Sprache auswählen',
  selectLanguageMessage: 'Wählen Sie Ihre bevorzugte Sprache',
  languageChangeNote: 'Die Interface-Sprache wird sofort nach der Auswahl geändert',

  // Sicherheitseinstellungen
  currentPassword: 'Aktuelles Passwort',
  newPassword: 'Neues Passwort',
  confirmPassword: 'Neues Passwort bestätigen',
  verificationCode: 'Bestätigungscode',
  sendVerificationCode: 'Bestätigungscode senden',
  sendCode: 'Code senden',
  resendCode: 'Erneut senden',
  resendTimer: 'Erneut senden ({seconds}s)',
  backToModify: 'Zurück zum Bearbeiten',
  confirmModify: 'Änderung bestätigen',
  enterNewEmail: 'Neue E-Mail eingeben',

  // Passwortstärke
  passwordStrengthWeak: 'Schwach',
  passwordStrengthMedium: 'Mittel',
  passwordStrengthStrong: 'Stark',
  passwordStrengthVeryStrong: 'Sehr stark',

  // Aktionsbuttons
  save: 'Speichern',
  saveChanges: 'Änderungen speichern',
  saving: 'Speichern...',
  applyChanges: 'Änderungen anwenden',

  // Passwortregeln und Hinweise
  passwordMinLength: 'Passwort muss mindestens {length} Zeichen lang sein',
  passwordStrengthTips:
    '• Passwortlänge mindestens 6 Zeichen\n• Empfohlen: Buchstaben, Zahlen und Sonderzeichen\n• Nächster Schritt sendet Bestätigungscode an Ihre E-Mail',
  verificationTips:
    '• Bestätigungscode ist 10 Minuten gültig\n• Falls Sie den Code nicht erhalten, prüfen Sie Ihren Spam-Ordner\n• Nach Passwort-Änderung müssen Sie sich erneut anmelden',

  // Benutzername-Validierung
  usernameMinLength: 'Benutzername muss mindestens {min} Zeichen lang sein (aktuell {current})',
  usernameOnlyAllowedChars:
    'Benutzername kann nur Buchstaben, Zahlen, Unterstriche und Bindestriche enthalten',
  usernamePlaceholder: 'Benutzername eingeben ({min}-{max} Zeichen)',

  // Passwort-Eingabehinweise
  enterCurrentPassword: 'Bitte geben Sie das aktuelle Passwort ein',
  enterNewPassword: 'Bitte geben Sie ein neues Passwort ein (mindestens 6 Zeichen)',
  confirmNewPassword: 'Bitte geben Sie das neue Passwort erneut ein',
  enterVerificationCode: 'Bitte geben Sie den 6-stelligen Bestätigungscode ein',

  // Erfolgs- und Fehlermeldungen
  profileUpdateSuccess: 'Profil erfolgreich aktualisiert',
  passwordChangeSuccess: 'Passwort erfolgreich geändert, bitte melden Sie sich erneut an',
  verificationCodeSent: 'Bestätigungscode an {email} gesendet',
  verificationCodeResent: 'Bestätigungscode erneut gesendet',

  // Fehlermeldungen sind in userTranslations und validationTranslations enthalten

  // Neue mobile Einstellungsoptionen
  changePassword: 'Passwort ändern',
  dataManagement: 'Datenverwaltung',

  // Ergänzende fehlende Schlüssel
  selectThemeMode: 'Theme-Modus auswählen',
  systemMode: 'System-Modus',
  lightMode: 'Hell-Modus',
  darkMode: 'Dunkel-Modus',
  databaseInfo: 'Datenbank-Info',
  storageType: 'Speichertyp',
  databaseSize: 'Datenbankgröße',
  bufferZone: 'Pufferzone',
  pendingWrites: '{{count}} ausstehende Schreibvorgänge',
  backToEdit: 'Zurück zum Bearbeiten',
  confirmChanges: 'Änderungen bestätigen',
  verificationCodeHints:
    '• Bestätigungscode ist 10 Minuten gültig\n• Falls Sie den Code nicht erhalten, prüfen Sie Ihren Spam-Ordner\n• Nach Passwort-Änderung müssen Sie sich erneut anmelden',
  passwordHints:
    '• Passwortlänge mindestens 6 Zeichen\n• Empfohlen: Buchstaben, Zahlen und Sonderzeichen\n• Nächster Schritt sendet Bestätigungscode an Ihre E-Mail',
  status: 'Status',

  // Konto löschen
  deleteAccount: 'Konto löschen',
  deleteAccountTitle: 'Konto löschen',
  deleteAccountWarning:
    'Nach dem Löschen Ihres Kontos werden alle Ihre Daten dauerhaft gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.',
  selectDeleteReason: 'Bitte wählen Sie einen Grund für die Löschung',
  deleteReasonNotUseful: 'Benötige dieses Produkt nicht mehr',
  deleteReasonFoundAlternative: 'Bessere Alternative gefunden',
  deleteReasonTooExpensive: 'Zu teuer',
  deleteReasonTooComplex: 'Zu kompliziert in der Nutzung',
  deleteReasonBugsIssues: 'Zu viele Fehler und Probleme',
  deleteReasonOther: 'Anderer Grund',
  deleteFeedbackPlaceholder: 'Erzählen Sie uns mehr (optional, max. 500 Zeichen)',
  deleteConfirmationHint: 'Bitte geben Sie Ihre E-Mail zur Bestätigung ein',
  confirmDeleteAccount: 'Kontolöschung bestätigen',
  deleting: 'Wird gelöscht...',
  deleteAccountSuccess: 'Konto erfolgreich gelöscht',
  deleteAccountError: 'Konto konnte nicht gelöscht werden',

  // PC Einstellungen zurücksetzen
  resetSettings: 'Einstellungen zurücksetzen',
  resetSettingsDescription:
    'Alle Konfigurationsdaten löschen und auf den Ausgangszustand zurücksetzen. Vault-Dateien bleiben unberührt. Neustart erforderlich.',
  resetSettingsConfirm:
    'Möchten Sie die Einstellungen wirklich zurücksetzen?\n\nAlle Konfigurationsdaten werden gelöscht (Vault-Dateien bleiben unberührt). Änderungen werden nach dem Neustart wirksam.',
  resetSettingsSuccess: 'Zurückgesetzt, bitte starten Sie die App neu',
  resetSettingsFailed: 'Zurücksetzen fehlgeschlagen, bitte später erneut versuchen',
  resetSettingsNotSupported: 'Dieser Vorgang wird in der aktuellen Umgebung nicht unterstützt',
  resetButton: 'Zurücksetzen',

  // Themenmodus-Beschreibungen
  lightModeDescription: 'Für helle Umgebungen geeignet',
  darkModeDescription: 'Optimal für Nacht oder schwache Beleuchtung',
  systemModeDescription: 'Automatisch mit OS synchronisieren',

  // ========== PC Einstellungsnavigation ==========
  account: 'Konto',
  accountDescription: 'Anmeldung & Mitgliedschaft',
  generalDescription: 'Aussehen & Einstellungen',
  providers: 'KI-Anbieter',
  providersDescription: 'API-Schlüssel & Modelle',
  mcp: 'MCP',
  mcpDescription: 'Tool-Erweiterungen',
  cloudSync: 'Cloud-Synchronisierung',
  cloudSyncDescription: 'Multi-Geräte-Sync',
  aboutDescription: 'Versionsinformationen',

  // ========== Modellkonfiguration ==========
  defaultModelLabel: 'Standardmodell (Optional)',
  defaultModelFormatHint:
    'Format: anbieter_id/modell_id. Bei leer wird das Standardmodell des ersten aktivierten Anbieters verwendet.',
  defaultModelConfigDescription:
    'Bitte konfigurieren Sie Anbieter und Modelle auf der Seite "KI-Anbieter" und legen Sie hier das globale Standardmodell fest.',

  // ========== KI-Anbieter ==========
  sdkTypeOpenAICompatible: 'OpenAI-kompatibel',
  membershipModel: 'Mitgliedschaftsmodell',
  customProviderSection: 'Benutzerdefinierte Anbieter',
  addCustomProvider: 'Benutzerdefinierten Anbieter hinzufügen',
  selectProviderPlaceholder: 'Bitte wählen Sie einen Anbieter von links',
  providerConfigLoading: 'Anbieterkonfiguration wird geladen...',
  documentation: 'Dokumentation',
  enterApiKey: 'API-Schlüssel eingeben',
  testButton: 'Testen',
  testing: 'Teste...',
  baseUrlHint: 'Leer lassen für Standard-Endpunkt',
  customProviderNameLabel: 'Anbietername',
  customProviderPlaceholder: 'Benutzerdefinierter Anbieter',
  deleteProvider: 'Anbieter löschen',
  modelsSection: 'Modelle',
  modelsCount: '{{count}} Modelle',
  searchModels: 'Modelle suchen...',
  noMatchingModels: 'Keine passenden Modelle gefunden',
  enabledModels: 'Aktivierte Modelle',
  disabledModels: 'Deaktivierte Modelle',
  noModelsConfigured: 'Keine Modelle konfiguriert',
  addCustomModel: 'Benutzerdefiniertes Modell hinzufügen',
  modelName: 'Modellname',
  modelId: 'Modell-ID',
  contextLength: 'Kontextlänge',
  outputLength: 'Ausgabelänge',
  customBadge: 'Benutzerdefiniert',
  reasoningBadge: 'Reasoning',
  multimodalBadge: 'Multimodal',
  toolsBadge: 'Tools',
  delete: 'Löschen',
  configureModel: 'Modell konfigurieren',
  apiAddress: 'API-Adresse',
  apiAddressOptional: 'API-Adresse (Optional)',
  sdkType: 'SDK-Typ',
  testSuccess: 'Verbindung erfolgreich',
  testFailed: 'Verbindung fehlgeschlagen',

  // ========== MCP-Konfiguration ==========
  mcpStdioSection: 'Stdio-Server',
  mcpHttpSection: 'HTTP-Server',
  mcpStdioEmpty: 'Keine Stdio-Server konfiguriert',
  mcpHttpEmpty: 'Keine HTTP-Server konfiguriert',
  addStdioServer: 'Stdio-Server hinzufügen',
  addHttpServer: 'HTTP-Server hinzufügen',
  serverName: 'Name',
  serverCommand: 'Befehl',
  serverArgs: 'Argumente',
  serverCwd: 'Arbeitsverzeichnis',
  serverUrl: 'URL',
  serverEnabled: 'Aktiviert',
  serverAutoApprove: 'Automatische Genehmigung',
  envVariables: 'Umgebungsvariablen',
  httpHeaders: 'HTTP-Header',
  addEnvVariable: 'Variable hinzufügen',
  addHeader: 'Header hinzufügen',

  // ========== Cloud-Synchronisierung ==========
  cloudSyncTitle: 'Cloud-Synchronisierung',
  cloudSyncSubtitle: 'Notizen zwischen Geräten synchronisieren',
  cloudSyncNeedLogin: 'Anmeldung erforderlich',
  cloudSyncNeedLoginDescription: 'Melden Sie sich an, um die Cloud-Synchronisierung zu nutzen',
  cloudSyncNeedVault: 'Bitte öffnen Sie zuerst einen Vault',
  cloudSyncNeedVaultDescription:
    'Öffnen Sie einen Vault, um die Cloud-Synchronisierung zu konfigurieren',
  cloudSyncEnabled: 'Cloud-Synchronisierung aktiviert',
  cloudSyncDisabled: 'Cloud-Synchronisierung deaktiviert',
  cloudSyncEnableFailed:
    'Aktivierung der Cloud-Synchronisierung fehlgeschlagen. Bitte später erneut versuchen',
  cloudSyncSyncing: 'Synchronisiere...',
  cloudSyncNeedsAttention: 'Aufmerksamkeit erforderlich',
  cloudSyncSynced: 'Synchronisiert',
  cloudSyncFailed: 'Synchronisierung fehlgeschlagen',
  cloudSyncNotEnabled: 'Nicht aktiviert',
  cloudSyncOffline: 'Offline',
  cloudSyncWorkspace: 'Arbeitsbereich: {{name}}',
  cloudSyncPendingFiles: '{{count}} Dateien warten auf Synchronisierung',
  cloudSyncLastSync: 'Zuletzt: {{time}}',
  cloudSyncNeverSynced: 'Nie synchronisiert',
  cloudSyncPaused: 'Cloud-Synchronisierung pausiert',
  cloudSyncTriggered: 'Synchronisierung ausgelöst',
  operationFailed: 'Vorgang fehlgeschlagen, bitte später erneut versuchen',
  syncSection: 'Synchronisierung',
  syncNow: 'Jetzt synchronisieren',
  enableCloudSync: 'Cloud-Sync aktivieren',
  smartIndex: 'Smart-Index',
  smartIndexDescription: 'Semantischen Index für Markdown-Dateien erstellen für intelligente Suche',
  enableSmartIndex: 'Smart-Index aktivieren',
  smartIndexAIDescription: 'KI für semantische Suche verwenden',
  indexedFiles: 'Indizierte Dateien',
  usage: 'Nutzung',
  storageSpace: 'Speicher',
  usedSpace: 'Genutzter Speicher',
  percentUsedPlan: '{{percent}}% genutzt · {{plan}}-Plan',
  currentPlan: 'Aktueller Plan: {{plan}} · Max. Dateigröße {{size}}',
  deviceInfo: 'Geräteinformationen',
  deviceName: 'Gerätename',
  deviceId: 'Geräte-ID',
  filesCount: '{{count}} Dateien',

  // ========== Über ==========
  versionInfo: 'Versionsinformationen',
  currentVersion: 'Aktuelle Version',
  unknown: 'Unbekannt',
  appVersion: 'Version',
  checkForUpdates: 'Nach Updates suchen',
  changelog: 'Änderungsprotokoll',
  licenses: 'Open-Source-Lizenzen',
  termsOfService: 'Nutzungsbedingungen',
  privacyPolicy: 'Datenschutzrichtlinie',
  copyright: '© {{year}} Moryflow. Alle Rechte vorbehalten.',

  // ========== MCP Voreinstellungen ==========
  mcpFetchWebContent: 'Webinhalte abrufen',
  mcpBraveSearch: 'Brave-Suchmaschine verwenden',
  mcpLibraryDocs: 'Neueste Bibliotheksdokumentation abrufen',
  mcpBrowserAutomation: 'Browser-Automatisierungstests',
  mcpWebCrawl: 'Web-Crawling und Datenextraktion',
  reconnectAll: 'Alle Server neu verbinden',
  manageServer: 'Diesen Server verwalten',
  envVariablesLabel: 'Umgebungsvariablen',
  httpHeadersLabel: 'Benutzerdefinierte Header',

  // ========== Modell-Eingabetypen ==========
  modalityText: 'Text',
  modalityImage: 'Bild',
  modalityAudio: 'Audio',
  modalityVideo: 'Video',

  // ========== Modellfähigkeiten ==========
  capabilityAttachment: 'Multimodale Eingabe',
  capabilityAttachmentDesc: 'Unterstützt Bilder, Dateien und Anhänge',
  capabilityReasoning: 'Reasoning-Modus',
  capabilityReasoningDesc: 'Unterstützt tiefes Denken/Reasoning',
  capabilityTemperature: 'Temperaturregelung',
  capabilityTemperatureDesc: 'Generierungszufälligkeit anpassen',
  capabilityToolCall: 'Tool-Aufruf',
  capabilityToolCallDesc: 'Unterstützt Function Calling',

  // ========== Modellsuche und -hinzufügung ==========
  searchModelPlaceholder: 'Modelle suchen, z.B. gpt-4o, claude-3...',
  modelIdExample: 'z.B. gpt-4o-2024-11-20',
  modelNameExample: 'z.B. GPT-4o (2024-11)',
  ollamaModelExample: 'z.B. qwen2.5:7b',

  // ========== Kauf ==========
  createPaymentLinkFailed:
    'Zahlungslink konnte nicht erstellt werden, bitte später erneut versuchen',

  // ========== Zahlungsdialog ==========
  completePayment: 'Zahlung abschließen',
  paymentOpenedInBrowser: 'Zahlungsseite im Browser geöffnet, bitte dort die Zahlung abschließen',
  waitingForPayment: 'Warten auf Zahlung...',
  paymentSuccessWillRedirect: 'Nach erfolgreicher Zahlung werden Sie automatisch zurückgeleitet',
  reopenPaymentPage: 'Zahlungsseite erneut öffnen',

  // ========== Kontolöschung Ergänzung ==========
  detailedFeedbackOptional: 'Detailliertes Feedback (optional)',
  emailMismatch: 'E-Mail stimmt nicht überein',

  // ========== Abonnement ==========
  starterPlan: 'Starter',
  basicPlan: 'Basis',
  proPlan: 'Pro',
  loadProductsFailed: 'Produkte konnten nicht geladen werden, bitte später erneut versuchen',
  subscriptionSuccess: 'Abonnement erfolgreich, Vorteile sind jetzt aktiv',
  recommended: 'Empfohlen',
  perMonth: '/Monat',
  perYear: '/Jahr',
  monthlyCredits: '{{credits}} Credits/Monat',
  currentPlanBadge: 'Aktueller Plan',
  subscribeNow: 'Jetzt abonnieren',
  upgradeMembership: 'Mitgliedschaft upgraden',
  choosePlanDescription: 'Wählen Sie den passenden Plan für Sie, schalten Sie mehr Funktionen frei',
  monthly: 'Monatlich',
  yearly: 'Jährlich',
  savePercent: '{{percent}}% sparen',
  subscriptionNote:
    'Sparen Sie 2 Monate mit jährlicher Abrechnung. Credits bleiben gleich. Jederzeit kündbar.',

  // ========== MCP-Konfiguration Ergänzung ==========
  loadingConfig: 'Konfiguration wird geladen...',

  // ========== Sandbox Settings ==========
  sandboxSettings: 'Sandbox',
  sandboxSettingsDescription: 'Agent-Dateisystemzugriff steuern',
  sandboxMode: 'Sandbox-Modus',
  sandboxModeNormal: 'Normal',
  sandboxModeNormalDescription: 'Agent kann nur auf Dateien in Ihrem Vault zugreifen',
  sandboxModeUnrestricted: 'Uneingeschränkt',
  sandboxModeUnrestrictedDescription: 'Agent kann auf alle Dateien auf Ihrem System zugreifen',
  sandboxAuthorizedPaths: 'Autorisierte Pfade',
  sandboxAuthorizedPathsDescription: 'Pfade, auf die Agent Zugriff gewährt wurde',
  sandboxNoAuthorizedPaths: 'Keine autorisierten Pfade',
  sandboxRemovePath: 'Entfernen',
  sandboxClearAllPaths: 'Alle löschen',
  sandboxClearAllConfirm: 'Sind Sie sicher, dass Sie alle autorisierten Pfade löschen möchten?',
} as const satisfies Record<keyof typeof en, string>;

export default de;
