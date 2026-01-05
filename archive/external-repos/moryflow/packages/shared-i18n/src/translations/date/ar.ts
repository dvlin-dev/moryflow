import en from './en'

const ar = {
  today: 'اليوم',
  yesterday: 'أمس',
  tomorrow: 'غداً',
  thisWeek: 'هذا الأسبوع',
  lastWeek: 'الأسبوع الماضي',
  nextWeek: 'الأسبوع القادم',
  thisMonth: 'هذا الشهر',
  lastMonth: 'الشهر الماضي',
  nextMonth: 'الشهر القادم',
} as const satisfies Record<keyof typeof en, string>

export default ar