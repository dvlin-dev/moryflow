/**
 * [PROVIDES]: SharePopover 状态管理 Hook
 * [DEPENDS]: desktopAPI.sitePublish, Site 类型
 * [POS]: Share 组件的核心状态管理
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import type { Site, BuildProgressEvent } from '../../../shared/ipc/site-publish'
import type {
  SharePanel,
  SubdomainStatus,
  SiteSettings,
  UseSharePopoverReturn,
  PublishInput,
} from './const'
import {
  SUBDOMAIN_CHECK_DEBOUNCE,
  SUBDOMAIN_PATTERN,
  SUBDOMAIN_MIN_LENGTH,
  SUBDOMAIN_MAX_LENGTH,
  extractErrorMessage,
} from './const'

/**
 * SharePopover 状态管理 Hook
 */
export function useSharePopover(initialSite?: Site): UseSharePopoverReturn {
  // UI 状态
  const [panel, setPanel] = useState<SharePanel>('main')

  // 发布状态
  const [subdomain, setSubdomainState] = useState('')
  const [subdomainStatus, setSubdomainStatus] = useState<SubdomainStatus>('idle')
  const [subdomainMessage, setSubdomainMessage] = useState<string>()

  // 发布进度
  const [publishing, setPublishing] = useState(false)
  const [progress, setProgress] = useState<BuildProgressEvent | null>(null)

  // 已发布站点
  const [publishedSite, setPublishedSite] = useState<Site | null>(initialSite ?? null)

  // 防抖定时器
  const checkDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 同步 initialSite 变化
  useEffect(() => {
    if (initialSite) {
      setPublishedSite(initialSite)
    }
  }, [initialSite])

  // 订阅进度事件
  useEffect(() => {
    const unsubscribe = window.desktopAPI.sitePublish.onProgress((event) => {
      setProgress(event)
    })
    return unsubscribe
  }, [])

  // 验证子域名格式
  const validateSubdomain = useCallback((value: string): { valid: boolean; message?: string } => {
    if (!value) {
      return { valid: false }
    }

    if (value.length < SUBDOMAIN_MIN_LENGTH) {
      return { valid: false, message: `At least ${SUBDOMAIN_MIN_LENGTH} characters` }
    }

    if (value.length > SUBDOMAIN_MAX_LENGTH) {
      return { valid: false, message: `At most ${SUBDOMAIN_MAX_LENGTH} characters` }
    }

    if (!SUBDOMAIN_PATTERN.test(value)) {
      return {
        valid: false,
        message: 'Only lowercase letters, numbers, and hyphens allowed',
      }
    }

    return { valid: true }
  }, [])

  // 设置子域名（带防抖检查）
  const setSubdomain = useCallback(
    (value: string) => {
      setSubdomainState(value)

      // 清除之前的定时器
      if (checkDebounceRef.current) {
        clearTimeout(checkDebounceRef.current)
      }

      // 验证格式
      const validation = validateSubdomain(value)
      if (!validation.valid) {
        setSubdomainStatus(value ? 'invalid' : 'idle')
        setSubdomainMessage(validation.message)
        return
      }

      // 设置检查中状态
      setSubdomainStatus('checking')
      setSubdomainMessage(undefined)

      // 防抖检查
      checkDebounceRef.current = setTimeout(async () => {
        try {
          const result = await window.desktopAPI.sitePublish.checkSubdomain(value)
          setSubdomainStatus(result.available ? 'available' : 'taken')
          setSubdomainMessage(
            result.available ? 'Available' : result.message || 'Already taken'
          )
        } catch (err) {
          setSubdomainStatus('invalid')
          setSubdomainMessage(extractErrorMessage(err, 'Check failed'))
        }
      }, SUBDOMAIN_CHECK_DEBOUNCE)
    },
    [validateSubdomain]
  )

  // 手动检查子域名（即时检查，无防抖）
  const checkSubdomain = useCallback(async (value: string) => {
    const validation = validateSubdomain(value)
    if (!validation.valid) {
      setSubdomainStatus(value ? 'invalid' : 'idle')
      setSubdomainMessage(validation.message)
      return
    }

    setSubdomainStatus('checking')
    setSubdomainMessage(undefined)

    try {
      const result = await window.desktopAPI.sitePublish.checkSubdomain(value)
      setSubdomainStatus(result.available ? 'available' : 'taken')
      setSubdomainMessage(result.available ? 'Available' : result.message || 'Already taken')
    } catch (err) {
      setSubdomainStatus('invalid')
      setSubdomainMessage(extractErrorMessage(err, 'Check failed'))
    }
  }, [validateSubdomain])

  // 发布
  const publish = useCallback(async (input: PublishInput): Promise<Site> => {
    setPublishing(true)
    setProgress(null)

    try {
      const result = await window.desktopAPI.sitePublish.buildAndPublish({
        sourcePaths: [input.filePath],
        type: 'MARKDOWN',
        subdomain: input.subdomain,
        title: input.title,
      })

      if (!result.success || !result.site) {
        throw new Error(result.error || 'Publish failed')
      }

      setPublishedSite(result.site)
      return result.site
    } catch (err) {
      const message = extractErrorMessage(err, 'Publish failed')
      throw new Error(message)
    } finally {
      setPublishing(false)
      setProgress(null)
    }
  }, [])

  // 下线站点
  const unpublish = useCallback(async () => {
    if (!publishedSite) return

    try {
      await window.desktopAPI.sitePublish.offline(publishedSite.id)
      // 刷新站点信息
      const sites = await window.desktopAPI.sitePublish.list()
      const updatedSite = sites.find((s) => s.id === publishedSite.id)
      setPublishedSite(updatedSite ?? null)
    } catch (err) {
      const message = extractErrorMessage(err, 'Failed to unpublish')
      throw new Error(message)
    }
  }, [publishedSite])

  // 更新设置
  const updateSettings = useCallback(
    async (settings: Partial<SiteSettings>) => {
      if (!publishedSite) return

      try {
        await window.desktopAPI.sitePublish.update({
          siteId: publishedSite.id,
          ...settings,
        })
        // 刷新站点信息
        const sites = await window.desktopAPI.sitePublish.list()
        const updatedSite = sites.find((s) => s.id === publishedSite.id)
        setPublishedSite(updatedSite ?? null)
      } catch (err) {
        const message = extractErrorMessage(err, 'Failed to update settings')
        throw new Error(message)
      }
    },
    [publishedSite]
  )

  // 重置状态
  const reset = useCallback(() => {
    setPanel('main')
    setSubdomainState('')
    setSubdomainStatus('idle')
    setSubdomainMessage(undefined)
    setPublishing(false)
    setProgress(null)
  }, [])

  return {
    panel,
    setPanel,
    subdomain,
    setSubdomain,
    subdomainStatus,
    subdomainMessage,
    publishing,
    progress,
    publishedSite,
    checkSubdomain,
    publish,
    unpublish,
    updateSettings,
    reset,
  }
}
