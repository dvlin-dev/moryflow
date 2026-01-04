import en from './en'

const de = {
  today: 'Heute',
  yesterday: 'Gestern',
  tomorrow: 'Morgen',
  thisWeek: 'Diese Woche',
  lastWeek: 'Letzte Woche',
  nextWeek: 'Nächste Woche',
  thisMonth: 'Diesen Monat',
  lastMonth: 'Letzten Monat',
  nextMonth: 'Nächsten Monat',
} as const satisfies Record<keyof typeof en, string>

export default de