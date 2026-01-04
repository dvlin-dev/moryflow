import en from './en'

const de = {
  online: 'Online',
  offline: 'Offline',
  away: 'Abwesend',
  busy: 'Beschäftigt',
  available: 'Verfügbar',
  connecting: 'Verbinde...',
  disconnected: 'Getrennt',
  error: 'Fehler',
  loading: 'Laden',
  syncing: 'Synchronisieren',
  uploading: 'Hochladen',
  downloading: 'Herunterladen',
  processing: 'Verarbeiten',
} as const satisfies Record<keyof typeof en, string>

export default de