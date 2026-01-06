/**
 * License Hooks
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { licensesApi, type LicensesQueryParams } from './api'

export const LICENSES_QUERY_KEY = ['admin', 'licenses'] as const

export function useLicenses(params: Omit<LicensesQueryParams, 'limit' | 'offset'> & {
  page: number
  pageSize: number
}) {
  const { page, pageSize, ...filters } = params
  return useQuery({
    queryKey: [...LICENSES_QUERY_KEY, filters.status, page],
    queryFn: () =>
      licensesApi.getAll({
        limit: pageSize,
        offset: (page - 1) * pageSize,
        ...filters,
      }),
  })
}

export function useRevokeLicense() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (licenseId: string) => licensesApi.revoke(licenseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LICENSES_QUERY_KEY })
      toast.success('License 已撤销')
    },
    onError: (error: Error) => {
      toast.error(`撤销失败: ${error.message}`)
    },
  })
}
