/**
 * [PROPS]: { filePath, fileTitle, publishedSite, onPublished, onNavigateToSites, children }
 * [EMITS]: onPublished(site) - 发布成功回调, onNavigateToSites() - 导航到 Sites
 * [POS]: Share 弹出层主组件，Notion 风格轻量 Popover
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import { useState, useCallback, useEffect } from 'react'
import {
  Globe,
  ChevronRight,
  ExternalLink,
  Copy,
  Check,
  FolderOpen,
} from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@moryflow/ui/components/popover'
import { Button } from '@moryflow/ui/components/button'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { PublishPanel } from './publish-panel'
import { SiteSettingsPanel } from './site-settings-panel'
import { useSharePopover } from './use-share-popover'
import type { SharePopoverProps, SharePanel } from './const'
import { SUBDOMAIN_SUFFIX } from './const'

/** 从文件名生成默认子域名 */
function generateDefaultSubdomain(fileName: string): string {
  // 移除扩展名
  const name = fileName.replace(/\.[^.]+$/, '')
  // 转换为 kebab-case
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 63)
}

export function SharePopover({
  filePath,
  fileTitle,
  publishedSite: initialSite,
  onPublished,
  onNavigateToSites,
  children,
}: SharePopoverProps) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const {
    panel,
    setPanel,
    subdomain,
    setSubdomain,
    subdomainStatus,
    subdomainMessage,
    publishing,
    progress,
    publishedSite,
    publish,
    unpublish,
    updateSettings,
    reset,
  } = useSharePopover(initialSite)

  // 从文件路径提取文件名
  const fileName = filePath.split('/').pop() || 'untitled'

  // Popover 打开时初始化子域名
  useEffect(() => {
    if (open && !publishedSite && !subdomain) {
      const defaultSubdomain = generateDefaultSubdomain(fileTitle || fileName)
      setSubdomain(defaultSubdomain)
    }
  }, [open, publishedSite, subdomain, fileTitle, fileName, setSubdomain])

  // Popover 关闭时重置状态
  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      setOpen(isOpen)
      if (!isOpen) {
        // 延迟重置，等动画完成
        setTimeout(reset, 200)
      }
    },
    [reset]
  )

  // 发布操作
  const handlePublish = useCallback(async () => {
    const site = await publish({
      filePath,
      subdomain,
      title: fileTitle,
    })
    toast.success('Published!', {
      description: `${subdomain}${SUBDOMAIN_SUFFIX}`,
      action: {
        label: 'View site',
        onClick: () => {
          window.open(`https://${subdomain}${SUBDOMAIN_SUFFIX}`, '_blank')
        },
      },
    })
    onPublished?.(site)
  }, [publish, filePath, subdomain, fileTitle, onPublished])

  // 下线操作
  const handleUnpublish = useCallback(async () => {
    await unpublish()
    toast.success('Site unpublished')
    setPanel('main')
  }, [unpublish, setPanel])

  // 复制链接并打开
  const handleCopyLink = useCallback(() => {
    if (!publishedSite) return
    navigator.clipboard.writeText(publishedSite.url)
    setCopied(true)
    toast.success('Link copied')
    // 自动打开链接
    window.open(publishedSite.url, '_blank')
    setTimeout(() => setCopied(false), 2000)
  }, [publishedSite])

  // 导航到 Sites
  const handleNavigateToSites = useCallback(() => {
    setOpen(false)
    onNavigateToSites?.()
  }, [onNavigateToSites])

  // 渲染主面板（未发布状态）
  const renderUnpublishedMain = () => (
    <div className="space-y-1">
      {/* Publish 入口 */}
      <button
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-accent transition-colors"
        onClick={() => setPanel('publish')}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
          <Globe className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-medium">Publish this page</div>
          <div className="text-xs text-muted-foreground">Publish to the web</div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </button>

      {/* 分隔线 */}
      <div className="my-2 border-t border-dashed border-border" />

      {/* Publish more files - 引导到 Sites */}
      <button
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-accent transition-colors"
        onClick={handleNavigateToSites}
      >
        <FolderOpen className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm">Publish more files</span>
        <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
      </button>
    </div>
  )

  // 渲染主面板（已发布状态）
  const renderPublishedMain = () => (
    <div className="space-y-1">
      {/* 已发布状态 */}
      <div className="flex items-center gap-3 rounded-lg bg-accent/50 px-3 py-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10">
          <Globe className="h-4 w-4 text-green-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-green-600">Published</div>
          <div className="text-xs text-muted-foreground truncate">
            {publishedSite?.subdomain}{SUBDOMAIN_SUFFIX}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => window.open(publishedSite?.url, '_blank')}
        >
          <ExternalLink className="h-4 w-4" />
        </Button>
      </div>

      {/* 分隔线 */}
      <div className="my-2 border-t border-dashed border-border" />

      {/* Site settings */}
      <button
        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-accent transition-colors"
        onClick={() => setPanel('settings')}
      >
        <span className="text-sm">Site settings</span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </button>

      {/* Unpublish */}
      <button
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-accent transition-colors text-destructive"
        onClick={handleUnpublish}
      >
        <span className="text-sm">Unpublish</span>
      </button>

      {/* 分隔线 */}
      <div className="my-2 border-t border-dashed border-border" />

      {/* 已发布链接显示 */}
      <div className="rounded-lg bg-muted/50 px-3 py-2">
        <div className="text-xs text-muted-foreground mb-1">Published URL</div>
        <div className="text-sm truncate">{publishedSite?.url}</div>
      </div>

      {/* Copy link - 点击复制并打开 */}
      <button
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-accent transition-colors"
        onClick={handleCopyLink}
      >
        {copied ? (
          <Check className="h-4 w-4 text-green-500" />
        ) : (
          <Copy className="h-4 w-4 text-muted-foreground" />
        )}
        <span className="text-sm">Copy link & open</span>
      </button>
    </div>
  )

  // 渲染内容
  const renderContent = () => {
    switch (panel) {
      case 'publish':
        return (
          <PublishPanel
            onBack={() => setPanel('main')}
            onPublished={onPublished || (() => {})}
            subdomain={subdomain}
            setSubdomain={setSubdomain}
            subdomainStatus={subdomainStatus}
            subdomainMessage={subdomainMessage}
            publishing={publishing}
            progress={progress}
            onPublish={handlePublish}
          />
        )
      case 'settings':
        if (!publishedSite) return null
        return (
          <SiteSettingsPanel
            site={publishedSite}
            onBack={() => setPanel('main')}
            onSettingsChange={updateSettings}
          />
        )
      default:
        return publishedSite ? renderPublishedMain() : renderUnpublishedMain()
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        align="end"
        className={cn(
          'w-80 p-3',
          // 面板切换动画
          'transition-all duration-200 ease-out'
        )}
      >
        {/* Header - 只在主面板显示 */}
        {panel === 'main' && (
          <div className="mb-3 text-sm font-medium">Share</div>
        )}

        {renderContent()}
      </PopoverContent>
    </Popover>
  )
}
