import en from './en'

const de = {
  generic: 'Ein Fehler ist aufgetreten',
  network: 'Netzwerkfehler',
  server: 'Serverfehler',
  client: 'Client-Fehler',
  validation: 'Validierungsfehler',
  authentication: 'Authentifizierungsfehler',
  authorization: 'Autorisierungsfehler',
  notFound: 'Nicht gefunden',
  conflict: 'Konfliktfehler',
  rateLimit: 'Rate-Limit überschritten',
  maintenance: 'Service unter Wartung',
  unknown: 'Unbekannter Fehler',
  // UI-Fehlergrenze Ergänzungen
  appErrorDescription: 'Entschuldigung, die Anwendung hat einen unerwarteten Fehler festgestellt. Wir haben dieses Problem protokolliert.',
  devErrorDetails: 'Fehlerdetails (Entwicklung):',
  viewStackTrace: 'Stack-Trace anzeigen',
  viewComponentStack: 'Komponenten-Stack anzeigen',
  resolutionIntro: 'Sie können Folgendes versuchen, um dies zu lösen:',
  resolutionActionRetry: 'Klicken Sie auf "Wiederholen", um die App weiter zu verwenden',
  resolutionActionRefresh: 'Aktualisieren Sie die Seite, um die App neu zu laden',
  resolutionActionGoHome: 'Kehren Sie zur Startseite zurück, um von vorn zu beginnen',
  resolutionActionContact: 'Falls das Problem weiterhin besteht, wenden Sie sich an den Support',

  // OSS-Service-Fehler
  ossSecretNotConfigured: 'EXPO_PUBLIC_OSS_SECRET nicht konfiguriert',
  uploadFailed: 'Upload fehlgeschlagen',
  transferFailed: 'Übertragung fehlgeschlagen',
} as const satisfies Record<keyof typeof en, string>

export default de