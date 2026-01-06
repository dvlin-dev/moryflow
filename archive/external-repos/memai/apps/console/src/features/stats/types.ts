/**
 * Stats feature types
 */

export interface StatsOverview {
  totalMemories: number
  totalApiCalls: number
  thisMonthMemories: number
  thisMonthApiCalls: number
}

export interface DailyUsage {
  date: string
  memories: number
  apiCalls: number
}

export interface MonthlyUsage {
  billingPeriod: string
  memories: number
  apiCalls: number
}
