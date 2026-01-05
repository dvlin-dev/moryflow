import en from './en'

const ja = {
  today: '今日',
  yesterday: '昨日',
  tomorrow: '明日',
  thisWeek: '今週',
  lastWeek: '先週',
  nextWeek: '来週',
  thisMonth: '今月',
  lastMonth: '先月',
  nextMonth: '来月',
} as const satisfies Record<keyof typeof en, string>

export default ja