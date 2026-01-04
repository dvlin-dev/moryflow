/**
 * Site Publish Hook
 * 站点发布相关的状态管理 Hook
 */

import { useState, useEffect, useCallback } from 'react'
import type {
  Site,
  BuildSiteInput,
  BuildProgressEvent,
  CreateSiteInput,
} from '../../../shared/ipc/site-publish'

/**
 * Extract actual error message from Electron IPC error
 * Removes "Error invoking remote method 'xxx': Error:" prefix
 */
function extractErrorMessage(err: unknown, fallback: string): string {
  if (!(err instanceof Error)) return fallback
  const match = err.message.match(/Error invoking remote method '[^']+': Error: (.+)/)
  return match ? match[1] : err.message
}

export interface UseSitePublishReturn {
  // 状态
  sites: Site[]
  loading: boolean
  error: string | null
  progress: BuildProgressEvent | null

  // 操作
  refreshSites: () => Promise<void>
  createSite: (input: CreateSiteInput) => Promise<Site>
  deleteSite: (siteId: string) => Promise<void>
  offlineSite: (siteId: string) => Promise<void>
  onlineSite: (siteId: string) => Promise<void>
  buildAndPublish: (input: BuildSiteInput) => Promise<void>
  checkSubdomain: (subdomain: string) => Promise<{ available: boolean; message?: string }>
}

export function useSitePublish(): UseSitePublishReturn {
  const [sites, setSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<BuildProgressEvent | null>(null)

  // 刷新站点列表
  const refreshSites = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await window.desktopAPI.sitePublish.list()
      setSites(list)
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to get sites'))
    } finally {
      setLoading(false)
    }
  }, [])

  // 创建站点
  const createSite = useCallback(async (input: CreateSiteInput): Promise<Site> => {
    setLoading(true)
    setError(null)
    try {
      const site = await window.desktopAPI.sitePublish.create(input)
      await refreshSites()
      return site
    } catch (err) {
      const message = extractErrorMessage(err, 'Failed to create site')
      setError(message)
      throw new Error(message)
    } finally {
      setLoading(false)
    }
  }, [refreshSites])

  // 删除站点
  const deleteSite = useCallback(async (siteId: string) => {
    setLoading(true)
    setError(null)
    try {
      await window.desktopAPI.sitePublish.delete(siteId)
      await refreshSites()
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to delete site'))
    } finally {
      setLoading(false)
    }
  }, [refreshSites])

  // 下线站点
  const offlineSite = useCallback(async (siteId: string) => {
    setLoading(true)
    setError(null)
    try {
      await window.desktopAPI.sitePublish.offline(siteId)
      await refreshSites()
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to take site offline'))
    } finally {
      setLoading(false)
    }
  }, [refreshSites])

  // 上线站点
  const onlineSite = useCallback(async (siteId: string) => {
    setLoading(true)
    setError(null)
    try {
      await window.desktopAPI.sitePublish.online(siteId)
      await refreshSites()
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to bring site online'))
    } finally {
      setLoading(false)
    }
  }, [refreshSites])

  // 构建并发布
  const buildAndPublish = useCallback(async (input: BuildSiteInput) => {
    setLoading(true)
    setError(null)
    setProgress(null)

    try {
      const result = await window.desktopAPI.sitePublish.buildAndPublish(input)
      if (!result.success) {
        throw new Error(result.error || 'Publish failed')
      }
      await refreshSites()
    } catch (err) {
      const message = extractErrorMessage(err, 'Publish failed')
      setError(message)
      throw new Error(message)
    } finally {
      setLoading(false)
      setProgress(null)
    }
  }, [refreshSites])

  // 检查子域名
  const checkSubdomain = useCallback(async (subdomain: string) => {
    try {
      return await window.desktopAPI.sitePublish.checkSubdomain(subdomain)
    } catch (err) {
      const message = extractErrorMessage(err, 'Check failed')
      return { available: false, message }
    }
  }, [])

  // 订阅进度事件
  useEffect(() => {
    const unsubscribe = window.desktopAPI.sitePublish.onProgress((event) => {
      setProgress(event)
    })
    return unsubscribe
  }, [])

  // 初始化加载
  useEffect(() => {
    refreshSites()
  }, [refreshSites])

  return {
    sites,
    loading,
    error,
    progress,
    refreshSites,
    createSite,
    deleteSite,
    offlineSite,
    onlineSite,
    buildAndPublish,
    checkSubdomain,
  }
}
