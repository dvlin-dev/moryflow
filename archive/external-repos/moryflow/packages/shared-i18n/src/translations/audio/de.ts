import en from './en'

const de = {
  // Aufnahmestatus
  recording: 'Aufnahme',
  paused: 'Pausiert',
  ready: 'Bereit',

  // Aufnahmeoperationen
  startRecording: 'Aufnahme starten',
  stopRecording: 'Aufnahme stoppen',
  pauseRecording: 'Aufnahme pausieren',
  resumeRecording: 'Aufnahme fortsetzen',

  // Wiedergabe-Steuerung
  play: 'Abspielen',
  pause: 'Pausieren',
  stop: 'Stoppen',

  // Statusanzeige
  duration: 'Dauer: {{time}}',
  recordingTime: 'Aufnahmezeit: {{time}}',

  // Fehlermeldungen
  recordingFailed: 'Aufnahme fehlgeschlagen',
  playbackFailed: 'Wiedergabe fehlgeschlagen',
  permissionDenied: 'Mikrofon-Berechtigung verweigert',
  deviceNotAvailable: 'Aufnahmegerät nicht verfügbar',

  // Erfolgsmeldungen
  recordingCompleted: 'Aufnahme abgeschlossen',
  recordingSaved: 'Aufnahme gespeichert',

  // UI-Statustext
  recStatus: 'AUF',
  recStatusActive: 'AUF•',
  pausedStatus: 'PAUSIERT',
  maxRecordingTime: '10:00',

  // Berechtigungen
  permissionRequired: 'Berechtigung erforderlich',
  microphonePermissionNeeded: 'Mikrofon-Berechtigung zur Audioaufnahme erforderlich',
  permissionRequestFailed: 'Anfrage für Audio-Berechtigung fehlgeschlagen',

  // Aufnahmebegrenzung und Hinweise
  recordingLimitReached: '{{duration}} Aufnahmegrenze erreicht',
  recordingTimeLimitNotice: 'Hinweis',

  // Fehlermeldungen
  recordingStartError: 'Aufnahme kann nicht gestartet werden, bitte versuchen Sie es erneut',
  recordingPauseError: 'Pausieren der Aufnahme fehlgeschlagen',
  recordingResumeError: 'Fortsetzen der Aufnahme fehlgeschlagen',
  recordingStopError: 'Stoppen der Aufnahme fehlgeschlagen',
  recordingCancelError: 'Bereinigung beim Abbrechen der Aufnahme fehlgeschlagen',
} as const satisfies Record<keyof typeof en, string>

export default de