/**
 * Stats API
 */
import { apiClient } from '@/lib/api-client'
import { CONSOLE_API } from '@/lib/api-paths'
import type { StatsOverview, DailyUsage, MonthlyUsage } from './types'

export async function getStatsOverview(): Promise<StatsOverview> {
  return apiClient.get<StatsOverview>(`${CONSOLE_API.STATS}/overview`)
}

export async function getDailyUsage(days: number = 30): Promise<DailyUsage[]> {
  return apiClient.get<DailyUsage[]>(`${CONSOLE_API.STATS}/daily?days=${days}`)
}

export async function getUsageHistory(limit: number = 12): Promise<MonthlyUsage[]> {
  return apiClient.get<MonthlyUsage[]>(`${CONSOLE_API.STATS}/history?limit=${limit}`)
}
