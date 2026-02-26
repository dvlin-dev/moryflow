/**
 * Users API 查询路径构造
 */
export const buildUsersListPath = (params: {
  limit: number
  offset: number
  tier?: string
  deleted?: boolean
}) => {
  const searchParams = new URLSearchParams({
    limit: String(params.limit),
    offset: String(params.offset),
  })

  if (params.tier && params.tier !== 'all') {
    searchParams.set('tier', params.tier)
  }

  if (params.deleted !== undefined) {
    searchParams.set('deleted', String(params.deleted))
  }

  return `/users?${searchParams.toString()}`
}

export const buildDeletionRecordsPath = (params: {
  limit: number
  offset: number
  reason?: string
}) => {
  const searchParams = new URLSearchParams({
    limit: String(params.limit),
    offset: String(params.offset),
  })

  if (params.reason) {
    searchParams.set('reason', params.reason)
  }

  return `/deletions?${searchParams.toString()}`
}
