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
    'Alle Konfigurationsdaten löschen und auf den Ausgangszustand zurücksetzen. Workspace-Dateien bleiben unberührt. Die App wird automatisch neu gestartet.',
  resetSettingsConfirm:
    'Möchten Sie die Einstellungen wirklich zurücksetzen?\n\nAlle Konfigurationsdaten werden gelöscht (Workspace-Dateien bleiben unberührt). Die App wird automatisch neu gestartet.',
  resetSettingsSuccess: 'Zurückgesetzt, Neustart...',
  resetSettingsFailed: 'Zurücksetzen fehlgeschlagen, bitte später erneut versuchen',
  resetSettingsNotSupported: 'Dieser Vorgang wird in der aktuellen Umgebung nicht unterstützt',
  resetButton: 'Zurücksetzen',

  // Themenmodus-Beschreibungen
  lightModeDescription: 'Für helle Umgebungen geeignet',
  darkModeDescription: 'Optimal für Nacht oder schwache Beleuchtung',
  systemModeDescription: 'Automatisch mit OS synchronisieren',
  closeBehavior: 'Beim Schließen des Fensters',
  closeBehaviorDescription:
    'Wählen Sie, was passieren soll, wenn Sie auf den Fensterschließen-Button klicken.',
  closeBehaviorHide: 'In Menüleiste ausblenden',
  closeBehaviorHideDescription: 'Moryflow läuft in der Menüleiste weiter.',
  closeBehaviorQuit: 'App beenden',
  closeBehaviorQuitDescription: 'Moryflow vollständig beenden.',
  closeBehaviorUpdateFailed: 'Verhalten beim Schließen konnte nicht aktualisiert werden',
  launchAtLogin: 'Beim Anmelden starten',
  launchAtLoginDescription: 'Moryflow automatisch starten, wenn Sie sich anmelden.',
  launchAtLoginUpdateFailed: 'Einstellung für Start bei Anmeldung konnte nicht aktualisiert werden',
  runtimeSettingsLoadFailed: 'Laufzeiteinstellungen der App konnten nicht geladen werden',
  updateChannel: 'Update-Kanal',
  updateChannelDescription:
    'Wählen Sie, ob dieses Gerät stabile Releases oder Beta-Vorschauen erhalten soll.',
  updateChannelStable: 'Stabil',
  updateChannelStableDescription:
    'Empfohlen für den täglichen Einsatz mit vollständig veröffentlichten Builds.',
  updateChannelBeta: 'Beta',
  updateChannelBetaDescription:
    'Erhalten Sie Vorschau-Builds früher, mit möglicher gelegentlicher Instabilität.',
  updateChannelUpdateFailed: 'Release-Kanal konnte nicht aktualisiert werden',
  automaticUpdateChecks: 'Automatische Update-Prüfung',
  automaticUpdateChecksDescription: 'Nach dem Start im Hintergrund nach neuen Versionen suchen.',
  autoCheckUpdateFailed: 'Automatische Update-Prüfung konnte nicht aktualisiert werden',
  manualUpdatePolicyDescription:
    'Download und Installation erfordern immer Ihre Bestätigung. Moryflow installiert Updates niemals erzwungen.',
  // ========== PC Einstellungsnavigation ==========
  account: 'Konto',
  accountDescription: 'Anmeldung & Mitgliedschaft',
  generalDescription: 'Aussehen & Einstellungen',
  personalization: 'Personalisierung',
  personalizationDescription: 'Benutzerdefinierte Anweisungen',
  providers: 'KI-Anbieter',
  providersDescription: 'API-Schlüssel & Modelle',
  mcp: 'MCP',
  mcpDescription: 'Tool-Erweiterungen',
  cloudSync: 'Cloud-Synchronisierung',
  cloudSyncDescription: 'Multi-Geräte-Sync',
  telegram: 'Telegram',
  telegramDescription: 'Bot-API-Kanal',
  aboutDescription: 'Versionsinformationen',

  // ========== Modellkonfiguration ==========
  defaultModelLabel: 'Standardmodell (Optional)',
  defaultModelFormatHint:
    'Format: anbieter_id/modell_id. Bei leer wird das Standardmodell des ersten aktivierten Anbieters verwendet.',
  defaultModelConfigDescription:
    'Bitte konfigurieren Sie Anbieter und Modelle auf der Seite "KI-Anbieter" und legen Sie hier das globale Standardmodell fest.',

  // ========== Personalization ==========
  customInstructionsLabel: 'Benutzerdefinierte Anweisungen',
  customInstructionsHint:
    'Beschreibe deinen bevorzugten Schreibstil, das Ausgabeformat und deine Arbeitsweise.',
  customInstructionsPlaceholder:
    'Beispiel: Antworte knapp. UI-Texte auf Englisch, technische Erklärungen auf Chinesisch.',

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
  cloudSyncSubtitle:
    'Optionale Dateisynchronisierung zwischen Geräten. Memory funktioniert auch ohne sie.',
  cloudSyncNeedLogin: 'Anmeldung erforderlich',
  cloudSyncNeedLoginDescription: 'Melden Sie sich an, um die Cloud-Synchronisierung zu nutzen',
  cloudSyncNeedVault: 'Bitte öffnen Sie zuerst einen Arbeitsbereich',
  cloudSyncNeedVaultDescription:
    'Öffnen Sie einen Arbeitsbereich, um die Cloud-Synchronisierung zu konfigurieren',
  cloudSyncEnabled: 'Cloud-Synchronisierung aktiviert',
  cloudSyncDisabled: 'Cloud-Synchronisierung deaktiviert',
  cloudSyncEnableFailed:
    'Aktivierung der Cloud-Synchronisierung fehlgeschlagen. Bitte später erneut versuchen',
  cloudSyncSyncing: 'Synchronisiere...',
  cloudSyncNeedsAttention: 'Aufmerksamkeit erforderlich',
  cloudSyncSynced: 'Synchronisiert',
  cloudSyncConflictCopyReady: 'Konfliktkopie bereit',
  cloudSyncFailed: 'Synchronisierung fehlgeschlagen',
  cloudSyncNotEnabled: 'Nicht aktiviert',
  cloudSyncOffline: 'Offline',
  cloudSyncUnavailable: 'Auf Mobilgeräten nicht verfügbar',
  cloudSyncRecoveryDescription:
    'Setze die Synchronisierung fort, um die letzten Änderungen sicher abzuschließen.',
  cloudSyncOfflineDescription:
    'Die Cloud ist derzeit nicht erreichbar. Versuche es erneut, sobald du wieder online bist.',
  cloudSyncSetupDescription:
    'Aktivieren Sie die Synchronisierung nur, wenn dieser Arbeitsbereich geräteübergreifend synchron bleiben soll.',
  cloudSyncMobileUnavailableDescription:
    'Cloud Sync ist auf Mobilgeräten vorübergehend nicht verfügbar, solange die Workspace-Profile-Neufassung abgeschlossen wird. Verwenden Sie den Desktop, um die Synchronisierung zu verwalten.',
  cloudSyncConflictCopyDescription:
    'Eine Konfliktkopie wurde behalten, damit nichts verloren geht.',
  cloudSyncWorkspace: 'Arbeitsbereich: {{name}}',
  cloudSyncPendingFiles: '{{count}} Dateien warten auf Synchronisierung',
  cloudSyncLastSync: 'Zuletzt: {{time}}',
  cloudSyncNeverSynced: 'Nie synchronisiert',
  cloudSyncAvailableOnDesktop: 'Am Desktop verfügbar',
  cloudSyncPaused: 'Cloud-Synchronisierung pausiert',
  cloudSyncTriggered: 'Synchronisierung ausgelöst',
  cloudSyncResumeRecovery: 'Wiederherstellung fortsetzen',
  cloudSyncTryAgain: 'Erneut versuchen',
  cloudSyncOpenConflictCopy: 'Konfliktkopie öffnen',
  cloudSyncOpenFirstConflictCopy: 'Erste Konfliktkopie öffnen',
  syncSettings: 'Sync-Einstellungen',
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
  latestVersion: 'Neueste Version',
  appUpdates: 'App-Updates',
  lastCheckedAt: 'Zuletzt geprüft',
  neverChecked: 'Nie',
  upToDate: 'Sie sind auf dem neuesten Stand',
  newVersionAvailable: 'Neue Version verfügbar',
  updateDownloading: 'Update wird heruntergeladen',
  updateReadyToInstall: 'Bereit zur Installation',
  unknown: 'Unbekannt',
  appVersion: 'Version',
  checkForUpdates: 'Nach Updates suchen',
  downloadUpdate: 'Update herunterladen',
  restartToInstall: 'Neu starten und installieren',
  restarting: 'Neustart wird durchgeführt…',
  skipThisVersion: 'Diese Version überspringen',
  releaseNotes: 'Versionshinweise',
  downloadFromBrowser: 'Im Browser herunterladen',
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
  starterPlanTagline: 'Für leichte persönliche Nutzung',
  basicPlanTagline: 'Für Creator mit regelmäßigem Workflow',
  proPlanTagline: 'Für Power-User und Teams',
  loadProductsFailed: 'Produkte konnten nicht geladen werden, bitte später erneut versuchen',
  subscriptionSuccess: 'Abonnement erfolgreich, Vorteile sind jetzt aktiv',
  recommended: 'Empfohlen',
  perMonth: '/Monat',
  perYear: '/Jahr',
  monthlyCredits: '{{credits}} Credits/Monat',
  currentPlanBadge: 'Aktueller Plan',
  currentPlanHelper: 'Dies ist Ihr aktiver Plan',
  currentPlanCta: 'In Ihrem Workspace enthalten',
  subscriptionSummaryEyebrow: 'Workspace-Pläne',
  subscriptionSummaryTitle: 'Einfache Preise für Ihren Workspace',
  subscriptionSummaryDescription: 'Wählen Sie nach Credits, Sync und Support.',
  subscribeNow: 'Jetzt abonnieren',
  upgradeMembership: 'Mitgliedschaft upgraden',
  choosePlanDescription: 'Wählen Sie den passenden Plan für Sie, schalten Sie mehr Funktionen frei',
  monthly: 'Monatlich',
  yearly: 'Jährlich',
  savePercent: '{{percent}}% sparen',
  annualBillingHighlight: '2 Monate gratis bei jährlicher Abrechnung',
  equivalentMonthly: 'Entspricht ${{price}}/Monat',
  allPaidPlansInclude: 'Alle Bezahlpläne enthalten',
  subscriptionNote:
    'Sparen Sie 2 Monate mit jährlicher Abrechnung. Credits bleiben gleich. Jederzeit kündbar.',

  // ========== MCP-Konfiguration Ergänzung ==========
  loadingConfig: 'Konfiguration wird geladen...',

  // ========== Sandbox Settings ==========
  sandboxSettings: 'Sandbox',
  sandboxSettingsDescription: 'Agent-Dateisystemzugriff steuern',
  sandboxMode: 'Sandbox-Modus',
  sandboxModeNormal: 'Normal',
  sandboxModeNormalDescription: 'Agent kann nur auf Dateien in Ihrem Workspace zugreifen',
  sandboxModeUnrestricted: 'Uneingeschränkt',
  sandboxModeUnrestrictedDescription: 'Agent kann auf alle Dateien auf Ihrem System zugreifen',
  sandboxAuthorizedPaths: 'Autorisierte Pfade',
  sandboxAuthorizedPathsDescription: 'Pfade außerhalb des Workspace mit Agent-Zugriff',
  sandboxAddPath: 'Pfad hinzufügen',
  sandboxPathPlaceholder: '/absolute/path/to/folder',
  sandboxPathMustBeAbsolute: 'Bitte geben Sie einen absoluten Pfad ein',
  sandboxNoAuthorizedPaths: 'Keine autorisierten Pfade',
  sandboxRemovePath: 'Entfernen',
  sandboxClearAllPaths: 'Alle löschen',
  sandboxClearAllConfirm: 'Sind Sie sicher, dass Sie alle autorisierten Pfade löschen möchten?',

  // ========== Kreditpakete ==========
  buyCredits: 'Credits kaufen',
  creditPackPopular: 'Beliebt',
  creditPackCredits: '{{credits}} Credits',
  creditPackBuyNow: 'Jetzt kaufen',
  creditPackExpiry: 'Credits verfallen 365 Tage nach dem Kauf.',
  creditPackUsageOrder:
    'Nutzungsreihenfolge: tägliches Freikontingent → Abo-Credits → gekaufte Credits.',
  creditPackPaymentSuccess: 'Zahlung abgeschlossen, Credits gutgeschrieben',

  // ========== Beta Notice ==========
  betaNoticePrefix: 'Purchasing is not available during beta. Join our ',
  betaNoticeLinkText: 'Discord',
  betaNoticeSuffix: ' for redemption codes!',
  community: 'Community',
  joinDiscord: 'Join Discord',
  communityDescription: 'Get support, share feedback, and connect with other users.',
} as const satisfies Record<keyof typeof en, string>;

export default de;
