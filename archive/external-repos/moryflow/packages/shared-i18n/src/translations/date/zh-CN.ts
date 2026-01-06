import en from './en'

const zhCN = {
  today: '今天',
  yesterday: '昨天',
  tomorrow: '明天',
  thisWeek: '本周',
  lastWeek: '上周',
  nextWeek: '下周',
  thisMonth: '本月',
  lastMonth: '上月',
  nextMonth: '下月',
} as const satisfies Record<keyof typeof en, string>

export default zhCN
