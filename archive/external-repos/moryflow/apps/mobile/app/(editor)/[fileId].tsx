import { View, ActivityIndicator, Alert, TextInput } from 'react-native'
import { Stack, router, useLocalSearchParams } from 'expo-router'
import { Text } from '@/components/ui/text'
import { Button } from '@/components/ui/button'
import { EditorWithToolbar } from '@/components/editor/EditorWithToolbar'
import {
  useVault,
  readFile,
  deleteFile,
  moveFile,
  writeFile,
  fileIndexManager,
} from '@/lib/vault'
import { addRecentlyOpened } from '@/lib/vault/recently-opened'
import { useState, useCallback, useRef, useEffect } from 'react'
import { useHideTabBar } from '@/lib/hooks/use-hide-tab-bar'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { FLOATING_BUTTON_SIZE, FLOATING_BUTTON_MARGIN, type SaveStatus } from './const'
import { BackButton, MoreButton, SaveStatusIndicator } from './components'
import { useTranslation } from '@moryflow/shared-i18n'

/**
 * 文件编辑器页面（基于 fileId 路由）
 *
 * 特点：
 * - 使用 fileId 作为路由参数，文件重命名不影响 URL
 * - 通过 fileIndexManager 解析 fileId → path
 * - 悬浮按钮布局 + 自动保存 + 底部保存状态
 */
export default function EditorByFileId() {
  // 进入编辑器时隐藏底部导航栏
  useHideTabBar()

  const { t } = useTranslation('common')
  const insets = useSafeAreaInsets()
  const { fileId } = useLocalSearchParams<{ fileId: string }>()
  const { vault, isInitialized } = useVault()

  // 状态
  const [currentPath, setCurrentPath] = useState<string | null>(null)
  const [content, setContent] = useState<string | null>(null)
  const [localContent, setLocalContent] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 保存状态管理
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const statusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 标题编辑状态
  const [editingTitle, setEditingTitle] = useState('')
  const [isRenaming, setIsRenaming] = useState(false)
  const titleInputRef = useRef<TextInput>(null)

  // 从 fileId 解析 path 并加载内容
  useEffect(() => {
    if (!vault || !fileId || !isInitialized) return

    const path = fileIndexManager.getByFileId(vault.path, fileId)
    if (!path) {
      setError(t('fileNotFound'))
      setIsLoading(false)
      return
    }

    setCurrentPath(path)

    // 设置初始标题
    const fileName = path.split('/').pop() || t('untitled')
    const fileTitle = fileName.replace(/\.[^/.]+$/, '') || fileName
    setEditingTitle(fileTitle)

    readFile(path)
      .then((text) => {
        setContent(text)
        setLocalContent(text)
        setIsLoading(false)
        // 记录最近打开
        addRecentlyOpened(path, fileId, fileTitle)
      })
      .catch((err) => {
        setError(err.message)
        setIsLoading(false)
      })
  }, [vault, fileId, isInitialized, t])

  // 文件名（基于 currentPath）
  const fileName = currentPath?.split('/').pop() || t('untitled')
  const fileTitle = fileName.replace(/\.[^/.]+$/, '') || fileName

  // 同步标题变化（currentPath 更新时）
  useEffect(() => {
    if (currentPath) {
      const newFileName = currentPath.split('/').pop() || t('untitled')
      const newTitle = newFileName.replace(/\.[^/.]+$/, '') || newFileName
      setEditingTitle(newTitle)
    }
  }, [currentPath])

  // 执行保存操作
  const doSave = useCallback(
    async (contentToSave: string) => {
      if (!currentPath) return

      setSaveStatus('saving')

      // 清除之前的状态定时器
      if (statusTimeoutRef.current) {
        clearTimeout(statusTimeoutRef.current)
      }

      try {
        await writeFile(currentPath, contentToSave)
        setSaveStatus('success')
        setLastSavedAt(new Date())

        // 2秒后切换回 idle 状态
        statusTimeoutRef.current = setTimeout(() => {
          setSaveStatus('idle')
        }, 2000)
      } catch (err) {
        console.error('Failed to save file:', err)
        setSaveStatus('error')

        // 3秒后切换回 idle 状态
        statusTimeoutRef.current = setTimeout(() => {
          setSaveStatus('idle')
        }, 3000)
      }
    },
    [currentPath]
  )

  // 防抖保存（1秒延迟）
  const debouncedSave = useCallback(
    (newContent: string) => {
      // 清除之前的定时器
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }

      // 设置新的定时器
      saveTimeoutRef.current = setTimeout(() => {
        doSave(newContent)
      }, 300)
    },
    [doSave]
  )

  // 内容变化处理
  const handleContentChange = useCallback(
    (newContent: string) => {
      setLocalContent(newContent)

      // 只有内容真正变化时才触发保存
      if (newContent !== content) {
        debouncedSave(newContent)
      }
    },
    [content, debouncedSave]
  )

  // 重命名处理
  const handleTitleBlur = useCallback(async () => {
    if (!vault || !currentPath) return

    const newTitle = editingTitle.trim()

    // 标题未变化或为空，恢复原标题
    if (!newTitle || newTitle === fileTitle) {
      setEditingTitle(fileTitle)
      return
    }

    setIsRenaming(true)
    try {
      const parentPath = currentPath.split('/').slice(0, -1).join('/')
      const newFileName = `${newTitle}.md`
      const newPath = parentPath ? `${parentPath}/${newFileName}` : newFileName

      await moveFile(currentPath, newPath)

      // 更新本地路径状态（不跳转路由，fileId 保持不变）
      setCurrentPath(newPath)
    } catch (err) {
      Alert.alert(t('renameFailed'), t('renameFailedMessage'))
      setEditingTitle(fileTitle) // 恢复原标题
    } finally {
      setIsRenaming(false)
    }
  }, [vault, currentPath, editingTitle, fileTitle, t])

  // 使用 ref 存储最新内容，避免闭包问题
  const localContentRef = useRef(localContent)
  useEffect(() => {
    localContentRef.current = localContent
  }, [localContent])

  // 返回前保存（清除防抖定时器，立即保存）
  const saveBeforeBack = useCallback(async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = null
    }

    const content = localContentRef.current
    if (currentPath && content !== null) {
      await doSave(content)
    }
  }, [currentPath, doSave])

  // 手动保存（用于菜单按钮）
  const handleSave = useCallback(async () => {
    if (localContent === null) return

    // 取消防抖定时器
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    await doSave(localContent)
    // 保存后返回
    router.back()
  }, [localContent, doSave])

  // 删除处理
  const handleDelete = useCallback(async () => {
    if (!currentPath) return

    Alert.alert(
      t('deleteTitle', { type: t('file') }),
      t('deleteFileConfirm', { name: fileTitle }),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteFile(currentPath)
              router.back()
            } catch (err) {
              console.error('Failed to delete file:', err)
              Alert.alert(t('deleteFailed'), t('deleteFailedMessage'))
            }
          },
        },
      ]
    )
  }, [currentPath, fileTitle, t])

  // 清理定时器
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
      if (statusTimeoutRef.current) {
        clearTimeout(statusTimeoutRef.current)
      }
    }
  }, [])

  // 悬浮按钮区域高度（安全区 + 按钮 + 边距）
  const floatingHeaderHeight = insets.top + FLOATING_BUTTON_SIZE + FLOATING_BUTTON_MARGIN

  // 错误状态
  if (error) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <Stack.Screen options={{ headerShown: false }} />
        <Text className="text-destructive mb-4">{error}</Text>
        <Button variant="outline" onPress={() => router.back()}>
          <Text>{t('back')}</Text>
        </Button>
      </View>
    )
  }

  // 加载状态
  if (isLoading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" />
        <Text className="text-muted-foreground mt-4">{t('loading')}</Text>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-background">
      {/* 隐藏原生导航栏 */}
      <Stack.Screen options={{ headerShown: false }} />

      {/* 悬浮按钮层 - 固定在顶部，不占用布局空间 */}
      <View
        style={{
          position: 'absolute',
          top: insets.top,
          left: 0,
          right: 0,
          zIndex: 100,
          flexDirection: 'row',
          justifyContent: 'space-between',
          paddingHorizontal: FLOATING_BUTTON_MARGIN,
          paddingVertical: 8,
        }}
        pointerEvents="box-none"
      >
        {/* 左侧：返回按钮 */}
        <BackButton onBeforeBack={saveBeforeBack} />

        {/* 右侧：更多按钮 */}
        <MoreButton onSave={handleSave} onDelete={handleDelete} />
      </View>

      {/* 内容区域 - 使用 style 处理动态 insets */}
      <View style={{ flex: 1, paddingTop: floatingHeaderHeight }}>
        <View className="flex-1">
          {/* 文件标题（可编辑） */}
          <View className="px-4 pt-2 pb-3">
            <TextInput
              ref={titleInputRef}
              value={editingTitle}
              onChangeText={setEditingTitle}
              onBlur={handleTitleBlur}
              editable={!isRenaming}
              className="text-xl font-semibold"
              style={{ padding: 0, margin: 0 }}
              returnKeyType="done"
              onSubmitEditing={() => titleInputRef.current?.blur()}
              selectTextOnFocus
            />
          </View>

          {/* 分割线 */}
          <View className="h-px bg-border/50 mx-4" />

          {/* 编辑器 */}
          <View className="flex-1">
            <EditorWithToolbar
              initialContent={localContent ?? ''}
              onContentChange={handleContentChange}
              placeholder="开始编辑..."
            />
          </View>
        </View>
      </View>

      {/* 底部保存状态指示器 */}
      <SaveStatusIndicator status={saveStatus} lastSavedAt={lastSavedAt} />
    </View>
  )
}
