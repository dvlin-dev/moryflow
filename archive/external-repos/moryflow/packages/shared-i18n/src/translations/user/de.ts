import en from './en'

const de = {
  profile: 'Profil',
  settings: 'Einstellungen',
  account: 'Konto',
  preferences: 'Einstellungen',
  notifications: 'Benachrichtigungen',
  privacy: 'Datenschutz',
  security: 'Sicherheit',
  language: 'Sprache',
  theme: 'Theme',
  name: 'Name',
  bio: 'Bio',
  changePassword: 'Passwort ändern',
  twoFactorAuth: 'Zwei-Faktor-Authentifizierung',
  deleteAccount: 'Konto löschen',
  exportData: 'Daten exportieren',
  // Fehlermeldungen
  updateFailed: 'Profil konnte nicht aktualisiert werden',
  uploadFailed: 'Datei konnte nicht hochgeladen werden',
  deleteFailed: 'Konto konnte nicht gelöscht werden',
  usernameRequired: 'Benutzername darf nicht leer sein',
  usernameTooShort: 'Benutzername muss mindestens 3 Zeichen lang sein',
  usernameTooLong: 'Benutzername darf maximal 20 Zeichen lang sein',
  usernameInvalidFormat: 'Benutzername kann nur Buchstaben, Zahlen, Unterstriche und Bindestriche enthalten',
  currentPasswordRequired: 'Bitte geben Sie das aktuelle Passwort ein',
  newPasswordRequired: 'Bitte geben Sie ein neues Passwort ein',
  confirmPasswordRequired: 'Bitte bestätigen Sie das neue Passwort',
  passwordTooShort: 'Passwort muss mindestens 6 Zeichen lang sein',
  passwordMismatch: 'Passwörter stimmen nicht überein',
  verificationCodeRequired: 'Bitte geben Sie den Bestätigungscode ein',
  verificationCodeInvalidLength: 'Bestätigungscode muss 6 Stellen haben',
  verificationCodeSendFailed: 'Bestätigungscode konnte nicht gesendet werden, bitte versuchen Sie es erneut',
  passwordChangeFailed: 'Passwort konnte nicht geändert werden, bitte versuchen Sie es erneut',
  emailUnavailable: 'E-Mail-Adresse ist nicht verfügbar',
  emailInvalid: 'Bitte geben Sie eine gültige E-Mail-Adresse ein',
  // Erfolgsmeldungen
  profileUpdated: 'Profil erfolgreich aktualisiert',
  passwordChanged: 'Passwort erfolgreich geändert',
  accountDeleted: 'Konto erfolgreich gelöscht',
  dataExported: 'Daten erfolgreich exportiert',
  // Neue mobile benutzerbezogene Inhalte
  defaultUsername: 'Benutzer',
  noEmail: 'Keine E-Mail',

  // Ergänzende fehlende Schlüssel
  usernameInputPlaceholder: 'Benutzername eingeben ({{min}}-{{max}} Zeichen)',
  usernameMinLengthError: 'Benutzername muss mindestens {{min}} Zeichen lang sein (aktuell {{current}})',
  usernameFormatHint: 'Unterstützt Buchstaben, Zahlen, Unterstriche und Bindestriche',
  emailNotEditable: 'E-Mail-Adresse kann nicht geändert werden',
  username: 'Benutzername',
} as const satisfies Record<keyof typeof en, string>

export default de