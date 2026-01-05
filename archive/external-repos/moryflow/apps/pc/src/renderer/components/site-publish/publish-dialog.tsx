/**
 * Publish Dialog
 * 站点发布对话框
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@moryflow/ui/components/dialog'
import { Button } from '@moryflow/ui/components/button'
import { Input } from '@moryflow/ui/components/input'
import { Label } from '@moryflow/ui/components/label'
import { Progress } from '@moryflow/ui/components/progress'
import { Loader2, Check, AlertCircle, Globe, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BuildSiteInput, BuildProgressEvent } from '../../../shared/ipc/site-publish'
import { useSitePublish } from './use-site-publish'

interface PublishDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sourcePaths: string[]
  title?: string
}

type Step = 'config' | 'publishing' | 'success' | 'error'

export function PublishDialog({
  open,
  onOpenChange,
  sourcePaths,
  title: defaultTitle,
}: PublishDialogProps) {
  const { buildAndPublish, checkSubdomain, progress } = useSitePublish()

  // 表单状态
  const [subdomain, setSubdomain] = useState('')
  const [title, setTitle] = useState(defaultTitle || '')
  const [description, setDescription] = useState('')

  // 子域名校验
  const [subdomainValid, setSubdomainValid] = useState<boolean | null>(null)
  const [subdomainMessage, setSubdomainMessage] = useState('')
  const [checkingSubdomain, setCheckingSubdomain] = useState(false)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // 发布状态
  const [step, setStep] = useState<Step>('config')
  const [publishedUrl, setPublishedUrl] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  // 重置状态
  useEffect(() => {
    if (open) {
      setStep('config')
      setSubdomain('')
      setTitle(defaultTitle || '')
      setDescription('')
      setSubdomainValid(null)
      setSubdomainMessage('')
      setErrorMessage('')
    }
    // 清理防抖计时器
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [open, defaultTitle])

  // 校验子域名
  const validateSubdomain = useCallback(async (value: string) => {
    if (value.length < 3) {
      setSubdomainValid(false)
      setSubdomainMessage('至少 3 个字符')
      return
    }

    setCheckingSubdomain(true)
    try {
      const result = await checkSubdomain(value)
      setSubdomainValid(result.available)
      setSubdomainMessage(result.message || (result.available ? '可用' : '不可用'))
    } finally {
      setCheckingSubdomain(false)
    }
  }, [checkSubdomain])

  // 处理子域名输入
  const handleSubdomainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
    setSubdomain(value)
    setSubdomainValid(null)

    // 清除之前的计时器
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // 延迟校验
    if (value.length >= 3) {
      debounceTimerRef.current = setTimeout(() => {
        validateSubdomain(value)
      }, 500)
    }
  }

  // 发布
  const handlePublish = async () => {
    if (!subdomain || subdomainValid !== true) return

    setStep('publishing')

    try {
      const input: BuildSiteInput = {
        sourcePaths,
        type: 'MARKDOWN',
        subdomain,
        title: title || undefined,
        description: description || undefined,
      }

      await buildAndPublish(input)
      setPublishedUrl(`https://${subdomain}.moryflow.app`)
      setStep('success')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : '发布失败')
      setStep('error')
    }
  }

  // 计算进度百分比
  const progressPercent = progress
    ? progress.total > 0
      ? Math.round((progress.current / progress.total) * 100)
      : 0
    : 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="size-5" />
            发布到网站
          </DialogTitle>
          <DialogDescription>
            将选中的文档发布为公开网站
          </DialogDescription>
        </DialogHeader>

        {step === 'config' && (
          <div className="space-y-4 py-4">
            {/* 源文件预览 */}
            <div className="rounded-lg bg-muted/50 p-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <FileText className="size-4" />
                <span>将要发布的内容</span>
              </div>
              <div className="text-sm">
                {sourcePaths.length === 1 ? (
                  <span className="font-medium">{sourcePaths[0].split('/').pop()}</span>
                ) : (
                  <span className="font-medium">{sourcePaths.length} 个文件/文件夹</span>
                )}
              </div>
            </div>

            {/* 子域名 */}
            <div className="space-y-2">
              <Label htmlFor="subdomain">网站地址</Label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Input
                    id="subdomain"
                    value={subdomain}
                    onChange={handleSubdomainChange}
                    placeholder="my-site"
                    className={cn(
                      'pr-8',
                      subdomainValid === true && 'border-green-500',
                      subdomainValid === false && 'border-red-500',
                    )}
                  />
                  {checkingSubdomain && (
                    <Loader2 className="absolute right-2 top-2.5 size-4 animate-spin text-muted-foreground" />
                  )}
                  {!checkingSubdomain && subdomainValid === true && (
                    <Check className="absolute right-2 top-2.5 size-4 text-green-500" />
                  )}
                  {!checkingSubdomain && subdomainValid === false && (
                    <AlertCircle className="absolute right-2 top-2.5 size-4 text-red-500" />
                  )}
                </div>
                <span className="text-sm text-muted-foreground">.moryflow.app</span>
              </div>
              {subdomainMessage && (
                <p className={cn(
                  'text-xs',
                  subdomainValid === true ? 'text-green-600' : 'text-red-600',
                )}>
                  {subdomainMessage}
                </p>
              )}
            </div>

            {/* 标题 */}
            <div className="space-y-2">
              <Label htmlFor="title">站点标题</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="我的网站"
              />
            </div>

            {/* 描述 */}
            <div className="space-y-2">
              <Label htmlFor="description">站点描述（可选）</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="这是一个很棒的网站..."
              />
            </div>
          </div>
        )}

        {step === 'publishing' && (
          <div className="py-8 space-y-4">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="size-8 animate-spin text-primary" />
              <div className="text-center">
                <p className="font-medium">{progress?.message || '正在发布...'}</p>
                <p className="text-sm text-muted-foreground">
                  {progress?.phase === 'scanning' && '扫描文件中'}
                  {progress?.phase === 'rendering' && '渲染页面中'}
                  {progress?.phase === 'uploading' && '上传文件中'}
                </p>
              </div>
            </div>
            <Progress value={progressPercent} className="w-full" />
          </div>
        )}

        {step === 'success' && (
          <div className="py-8 space-y-4">
            <div className="flex flex-col items-center gap-4">
              <div className="size-12 rounded-full bg-green-100 flex items-center justify-center">
                <Check className="size-6 text-green-600" />
              </div>
              <div className="text-center">
                <p className="font-medium">发布成功!</p>
                <a
                  href={publishedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  {publishedUrl}
                </a>
              </div>
            </div>
          </div>
        )}

        {step === 'error' && (
          <div className="py-8 space-y-4">
            <div className="flex flex-col items-center gap-4">
              <div className="size-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="size-6 text-red-600" />
              </div>
              <div className="text-center">
                <p className="font-medium text-red-600">发布失败</p>
                <p className="text-sm text-muted-foreground">{errorMessage}</p>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {step === 'config' && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                取消
              </Button>
              <Button
                onClick={handlePublish}
                disabled={!subdomain || subdomainValid !== true}
              >
                发布
              </Button>
            </>
          )}
          {step === 'publishing' && (
            <Button variant="outline" disabled>
              发布中...
            </Button>
          )}
          {(step === 'success' || step === 'error') && (
            <Button onClick={() => onOpenChange(false)}>
              完成
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
