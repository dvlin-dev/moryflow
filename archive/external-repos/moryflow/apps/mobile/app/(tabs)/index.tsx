/**
 * 首页 - 文件系统浏览器
 *
 * 功能：
 * - 展示 Vault 中的文件和目录（支持展开/收起）
 * - 点击文件打开编辑器
 * - 点击文件夹展开/收起
 * - 顶部左侧工作区选择器（显示 vault 名称和同步状态）
 * - 顶部右侧玻璃按钮打开设置/反馈/关于我们
 * - 最近打开的文档卡片区域
 * - 文件区 Section Header 带创建按钮
 */

import { View, Pressable, Alert, Platform, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { Text } from '@/components/ui/text'
import { WorkspaceSelector } from '@/components/cloud-sync'
import { FileList } from '@/components/vault/FileList'
import { RecentlyOpened } from '@/components/vault/RecentlyOpened'
import { WebViewSheet } from '@/components/ui/WebViewSheet'
import { GlassButton } from '@/components/ui/glass-button'
import {
  useVault,
  useVaultTree,
  useVaultManager,
  createDirectory,
  writeFile,
  fileExists,
  fileIndexManager,
  getVault,
  type VaultTreeNode,
} from '@/lib/vault'
import { addRecentlyOpened } from '@/lib/vault/recently-opened'
import { useCloudSyncInit, useCloudSync } from '@/lib/cloud-sync'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useThemeColors } from '@/lib/theme'
import { MoreHorizontalIcon, PlusIcon } from 'lucide-react-native'
import { useCallback, useState } from 'react'

// iOS 原生组件
let ContextMenu: any = null
let Host: any = null
let Button: any = null

if (Platform.OS === 'ios') {
  try {
    const swiftUI = require('@expo/ui/swift-ui')
    ContextMenu = swiftUI.ContextMenu
    Host = swiftUI.Host
    Button = swiftUI.Button
  } catch (error) {
    console.warn('[@expo/ui/swift-ui] ContextMenu 加载失败')
  }
}

// WebView Sheet 类型
type SheetType = 'feedback' | 'about' | null

// URL 配置
const SHEET_URLS = {
  feedback: 'https://moryflow.com/feedback',
  about: 'https://moryflow.com/about',
} as const

const SHEET_TITLES = {
  feedback: '反馈',
  about: '关于我们',
} as const

export default function HomeScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const colors = useThemeColors()

  const { isInitialized: vaultInitialized, vault } = useVault()
  const { currentVault } = useVaultManager()
  const { items, isLoading, isRefreshing, refresh } = useVaultTree()

  // 初始化云同步
  useCloudSyncInit(vaultInitialized ? (vault?.path ?? null) : null)
  const { handleFileChange } = useCloudSync()

  // WebView Sheet 状态
  const [activeSheet, setActiveSheet] = useState<SheetType>(null)

  const openSettings = () => {
    router.push('/(settings)')
  }

  // 处理文件点击 - 打开编辑器并记录到最近打开
  const handleFilePress = useCallback(
    async (item: VaultTreeNode) => {
      const vault = await getVault()
      if (!vault) return

      // 获取或创建 fileId
      const fileId = await fileIndexManager.getOrCreate(vault.path, item.path)
      const title = item.name.replace(/\.[^/.]+$/, '')

      // 记录到最近打开
      await addRecentlyOpened(item.path, fileId, title)

      // 使用 fileId 导航
      router.push(`/(editor)/${fileId}` as any)
    },
    [router]
  )

  const handleItemLongPress = useCallback((_item: VaultTreeNode) => {
    // 长按菜单已在 FileList 组件中实现
  }, [])

  // 在根目录创建新文件夹
  const handleCreateFolderAtRoot = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      Alert.prompt(
        '新建文件夹',
        '请输入文件夹名称',
        async (name) => {
          if (!name?.trim()) {
            resolve()
            return
          }
          try {
            await createDirectory(name.trim())
            refresh()
          } catch (error) {
            console.error('Failed to create folder:', error)
            Alert.alert('创建失败', '无法创建文件夹，请重试')
          }
          resolve()
        },
        'plain-text',
        '',
        'default'
      )
    })
  }, [refresh])

  // 在指定目录创建新文件夹
  const handleCreateFolder = useCallback(
    (parentPath: string): Promise<void> => {
      return new Promise((resolve) => {
        Alert.prompt(
          '新建文件夹',
          '请输入文件夹名称',
          async (name) => {
            if (!name?.trim()) {
              resolve()
              return
            }
            try {
              const folderPath = parentPath ? `${parentPath}/${name.trim()}` : name.trim()
              await createDirectory(folderPath)
              refresh()
            } catch (error) {
              console.error('Failed to create folder:', error)
              Alert.alert('创建失败', '无法创建文件夹，请重试')
            }
            resolve()
          },
          'plain-text',
          '',
          'default'
        )
      })
    },
    [refresh]
  )

  // 在根目录创建新文件
  const handleCreateFileAtRoot = useCallback(async () => {
    try {
      const vault = await getVault()
      if (!vault) return

      let fileName = '未命名.md'
      let filePath = fileName
      let counter = 1

      while (await fileExists(filePath)) {
        fileName = `未命名 ${counter}.md`
        filePath = fileName
        counter++
      }

      await writeFile(filePath, '')
      refresh()

      // 通知云同步引擎文件变化
      handleFileChange()

      // 获取 fileId 并记录到最近打开
      const fileId = await fileIndexManager.getOrCreate(vault.path, filePath)
      const title = fileName.replace(/\.md$/, '')
      await addRecentlyOpened(filePath, fileId, title)

      router.push(`/(editor)/${fileId}` as any)
    } catch (error) {
      console.error('Failed to create file:', error)
      Alert.alert('创建失败', '无法创建文件，请重试')
    }
  }, [refresh, router, handleFileChange])

  // 在指定目录创建新文件（无需输入名称，默认"未命名"）
  const handleCreateFile = useCallback(
    async (parentPath: string) => {
      try {
        const vault = await getVault()
        if (!vault) return

        // 生成唯一文件名
        let fileName = '未命名.md'
        let filePath = parentPath ? `${parentPath}/${fileName}` : fileName
        let counter = 1

        // 检查文件是否已存在，如果存在则添加数字后缀
        while (await fileExists(filePath)) {
          fileName = `未命名 ${counter}.md`
          filePath = parentPath ? `${parentPath}/${fileName}` : fileName
          counter++
        }

        await writeFile(filePath, '')
        refresh()

        // 通知云同步引擎文件变化
        handleFileChange()

        // 获取 fileId 并记录到最近打开
        const fileId = await fileIndexManager.getOrCreate(vault.path, filePath)
        const title = fileName.replace(/\.md$/, '')
        await addRecentlyOpened(filePath, fileId, title)

        // 创建后直接跳转到详情页
        router.push(`/(editor)/${fileId}` as any)
      } catch (error) {
        console.error('Failed to create file:', error)
        Alert.alert('创建失败', '无法创建文件，请重试')
      }
    },
    [refresh, router, handleFileChange]
  )

  // 打开反馈页面
  const handleFeedback = useCallback(() => {
    setActiveSheet('feedback')
  }, [])

  // 打开关于我们页面
  const handleAbout = useCallback(() => {
    setActiveSheet('about')
  }, [])

  // 关闭 Sheet
  const handleCloseSheet = useCallback(() => {
    setActiveSheet(null)
  }, [])

  // 渲染右侧玻璃按钮（... 更多按钮）
  const renderHeaderButton = () => {
    const icon = <MoreHorizontalIcon size={22} color={colors.textPrimary} strokeWidth={2} />

    // iOS 原生 ContextMenu
    if (Platform.OS === 'ios' && ContextMenu && Host && Button) {
      return (
        <Host className="w-10 h-10">
          <ContextMenu>
            <ContextMenu.Items>
              <Button systemImage="gearshape" onPress={openSettings}>
                设置
              </Button>
              <Button systemImage="bubble.left.and.text.bubble.right" onPress={handleFeedback}>
                反馈
              </Button>
              <Button systemImage="info.circle" onPress={handleAbout}>
                关于我们
              </Button>
            </ContextMenu.Items>
            <ContextMenu.Trigger>
              <GlassButton icon={icon} size="md" />
            </ContextMenu.Trigger>
          </ContextMenu>
        </Host>
      )
    }

    // Fallback: 简单 Pressable 打开设置
    return <GlassButton icon={icon} size="md" onPress={openSettings} />
  }

  // 渲染文件区 Section Header（带创建按钮）
  const renderFileSectionHeader = () => {
    const plusIcon = <PlusIcon size={20} color={colors.textSecondary} />

    // iOS 原生 ContextMenu
    if (Platform.OS === 'ios' && ContextMenu && Host && Button) {
      return (
        <View className="flex-row items-center justify-between px-4 py-2">
          <Text className="text-[13px] font-semibold text-muted-foreground">文件</Text>
          <Host className="w-8 h-8">
            <ContextMenu>
              <ContextMenu.Items>
                <Button systemImage="doc.badge.plus" onPress={handleCreateFileAtRoot}>
                  新建文件
                </Button>
                <Button systemImage="folder.badge.plus" onPress={handleCreateFolderAtRoot}>
                  新建文件夹
                </Button>
              </ContextMenu.Items>
              <ContextMenu.Trigger>
                <View className="w-8 h-8 items-center justify-center">{plusIcon}</View>
              </ContextMenu.Trigger>
            </ContextMenu>
          </Host>
        </View>
      )
    }

    // Fallback
    return (
      <View className="flex-row items-center justify-between px-4 py-2">
        <Text className="text-[13px] font-semibold text-muted-foreground">文件</Text>
        <Pressable onPress={handleCreateFileAtRoot} className="w-8 h-8 items-center justify-center">
          {plusIcon}
        </Pressable>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-transparent">
      {/* Header - 无底部边框 */}
      <View
        className="flex-row items-center justify-between px-4 pb-3"
        style={{ paddingTop: insets.top }}
      >
        {/* 左侧：工作区选择器（含同步状态） */}
        <WorkspaceSelector vaultName={currentVault?.name} />

        {/* 中间：占位 */}
        <View className="flex-1" />

        {/* 右侧：更多按钮 */}
        <View className="w-10 items-end">{renderHeaderButton()}</View>
      </View>

      {/* 滚动内容区域 */}
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* 最近打开的文档 */}
        <RecentlyOpened />

        {/* 文件区 Section Header */}
        {renderFileSectionHeader()}

        {/* 文件列表 */}
        <FileList
          items={items}
          isLoading={isLoading || !vaultInitialized}
          isRefreshing={isRefreshing}
          onFilePress={handleFilePress}
          onItemLongPress={handleItemLongPress}
          onRefresh={refresh}
          onCreateFile={handleCreateFile}
          onCreateFolder={handleCreateFolder}
          emptyText="暂无文件，开始创建你的第一个笔记吧"
          disableScrollView
        />
      </ScrollView>

      {/* WebView Sheet */}
      {activeSheet && (
        <WebViewSheet
          visible={activeSheet !== null}
          onClose={handleCloseSheet}
          url={SHEET_URLS[activeSheet]}
          title={SHEET_TITLES[activeSheet]}
        />
      )}
    </View>
  )
}
