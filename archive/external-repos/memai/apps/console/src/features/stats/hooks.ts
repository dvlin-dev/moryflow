/**
 * Stats React Query hooks
 */
import { useQuery } from '@tanstack/react-query'
import { getStatsOverview, getDailyUsage, getUsageHistory } from './api'

export function useStatsOverview() {
  return useQuery({
    queryKey: ['stats', 'overview'],
    queryFn: getStatsOverview,
    staleTime: 60 * 1000, // 1 minute
  })
}

export function useDailyUsage(days: number = 30) {
  return useQuery({
    queryKey: ['stats', 'daily', days],
    queryFn: () => getDailyUsage(days),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useUsageHistory(limit: number = 12) {
  return useQuery({
    queryKey: ['stats', 'history', limit],
    queryFn: () => getUsageHistory(limit),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}
