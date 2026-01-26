/**
 * [PROPS]: TruncatedOutputProps
 * [POS]: Mobile 端工具截断输出渲染与完整内容弹层
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import * as React from 'react'
import { ScrollView, View } from 'react-native'
import { File } from 'expo-file-system'
import { Text } from '@/components/ui/text'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useTranslation } from '@/lib/i18n'
import type { TruncatedOutputResult } from './const'

interface TruncatedOutputProps {
  result: TruncatedOutputResult
}

export function TruncatedOutput({ result }: TruncatedOutputProps) {
  const { t } = useTranslation('chat')
  const { t: tCommon } = useTranslation('common')
  const [open, setOpen] = React.useState(false)
  const [content, setContent] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)

  const hasPath = typeof result.fullPath === 'string' && result.fullPath.length > 0

  const loadContent = React.useCallback(async () => {
    if (!hasPath) {
      setError(t('openFileFailed'))
      return
    }
    setLoading(true)
    setError(null)
    try {
      const file = new File(result.fullPath)
      const text = await file.text()
      setContent(text)
    } catch (err) {
      console.error(err)
      setError(t('openFileFailed'))
    } finally {
      setLoading(false)
    }
  }, [hasPath, result.fullPath, t])

  const handleOpen = React.useCallback(() => {
    setOpen(true)
    if (content === null && !loading) {
      void loadContent()
    }
  }, [content, loadContent, loading])

  return (
    <View className="rounded-lg border border-border/60 bg-muted/30 p-3 gap-3">
      <View className="flex-row items-center justify-between">
        <Text className="text-xs font-medium text-muted-foreground uppercase">
          {t('outputTruncated')}
        </Text>
        {hasPath && (
          <Button variant="secondary" size="sm" onPress={handleOpen}>
            <Text className="text-xs">{t('viewFullOutput')}</Text>
          </Button>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="rounded-lg border border-border/60 bg-background"
      >
        <View className="p-2">
          <Text className="font-mono text-xs">{result.preview}</Text>
        </View>
      </ScrollView>

      {hasPath && (
        <Text className="text-xs text-muted-foreground">
          {t('fullOutputPath')}: <Text className="font-mono">{result.fullPath}</Text>
        </Text>
      )}

      {result.hint && <Text className="text-xs text-muted-foreground">{result.hint}</Text>}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[80%]">
          <DialogHeader>
            <DialogTitle>{t('fullOutputTitle')}</DialogTitle>
          </DialogHeader>
          {loading && <Text className="text-sm text-muted-foreground">{tCommon('loading')}</Text>}
          {error && <Text className="text-sm text-destructive">{error}</Text>}
          {!loading && !error && content !== null && (
            <ScrollView className="rounded-lg border border-border/60 bg-background">
              <View className="p-3">
                <Text className="font-mono text-xs">{content}</Text>
              </View>
            </ScrollView>
          )}
        </DialogContent>
      </Dialog>
    </View>
  )
}
