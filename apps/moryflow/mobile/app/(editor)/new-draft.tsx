/**
 * [PROPS]: none（Expo Router Screen）
 * [POS]: 草稿快速创建页（标题防抖创建/重命名 + 内容编辑），返回时回到进入前的 tab
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { View, type TextInput } from 'react-native';
import { Stack, router } from 'expo-router';
import { EditorWithToolbar } from '@/components/editor/EditorWithToolbar';
import {
  useVault,
  writeFile,
  deleteFile,
  moveFile,
  fileExists,
  fileIndexManager,
} from '@/lib/vault';
import { useState, useCallback, useRef, useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FLOATING_BUTTON_SIZE, FLOATING_BUTTON_MARGIN, type SaveStatus } from './const';
import { BackButton, MoreButton, SaveStatusIndicator, TitleInput } from './components';
import { generateDraftFileName, ensureDraftsDirectory } from './helper';

/**
 * 新建草稿页面
 *
 * 特点：
 * - 默认聚焦 title 输入框
 * - title 输入停止 300ms 后自动创建/重命名文件（防抖策略）
 * - 内容输入时自动创建文件（如果 title 为空）
 * - 文件创建后原地切换为编辑模式
 */
export default function NewDraftScreen() {
  const insets = useSafeAreaInsets();
  const { vault, isInitialized } = useVault();

  // 核心状态：文件是否已创建
  const [fileId, setFileId] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState<string | null>(null);

  // 编辑状态
  const [editingTitle, setEditingTitle] = useState('');
  const [localContent, setLocalContent] = useState('');

  // 保存状态
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 输入框引用
  const titleInputRef = useRef<TextInput>(null);

  // 创建中标记，防止并发创建
  const isCreatingRef = useRef(false);
  // 重命名中标记
  const isRenamingRef = useRef(false);

  // 安全返回（无历史记录时跳转首页）
  const safeGoBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  }, []);

  // 默认聚焦 title
  useEffect(() => {
    if (isInitialized) {
      // 延迟聚焦，确保页面渲染完成
      const timer = setTimeout(() => {
        titleInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isInitialized]);

  // 创建文件
  const createDraftFile = useCallback(
    async (
      fileName: string,
      content: string = ''
    ): Promise<{ fileId: string; path: string } | null> => {
      if (!vault || isCreatingRef.current) return null;

      isCreatingRef.current = true;
      try {
        // 确保 drafts 目录存在
        await ensureDraftsDirectory();

        // 生成完整路径
        const relativePath = `drafts/${fileName}.md`;

        // 写入文件
        await writeFile(relativePath, content);

        // 获取 fileId
        const newFileId = await fileIndexManager.getOrCreate(vault.path, relativePath);

        return { fileId: newFileId, path: relativePath };
      } catch (err) {
        console.error('Failed to create draft:', err);
        return null;
      } finally {
        isCreatingRef.current = false;
      }
    },
    [vault]
  );

  // 使用 ref 存储最新的 localContent，避免闭包问题
  const localContentRef = useRef(localContent);
  useEffect(() => {
    localContentRef.current = localContent;
  }, [localContent]);

  // 使用 ref 存储最新的状态，避免闭包陷阱
  const fileIdRef = useRef(fileId);
  const currentPathRef = useRef(currentPath);
  useEffect(() => {
    fileIdRef.current = fileId;
    currentPathRef.current = currentPath;
  }, [fileId, currentPath]);

  // 执行 title 创建或重命名（使用 ref 获取最新状态）
  const doTitleAction = useCallback(
    async (title: string) => {
      const trimmedTitle = title.trim();
      if (!trimmedTitle) return;

      // 使用 ref 获取最新状态
      const currentFileId = fileIdRef.current;
      const currentFilePath = currentPathRef.current;

      // 已创建文件，走重命名逻辑
      if (currentFileId && currentFilePath) {
        if (isRenamingRef.current) return;

        const currentFileName = currentFilePath.split('/').pop()?.replace(/\.md$/, '') || '';
        if (trimmedTitle === currentFileName) return;

        isRenamingRef.current = true;
        try {
          // 检查新文件名是否冲突
          let finalFileName = trimmedTitle;
          const newPath = `drafts/${finalFileName}.md`;

          if (await fileExists(newPath)) {
            const randomSuffix = Math.floor(Math.random() * 90 + 10).toString();
            finalFileName = `${trimmedTitle}-${randomSuffix}`;
          }

          const finalPath = `drafts/${finalFileName}.md`;
          await moveFile(currentFilePath, finalPath);
          setCurrentPath(finalPath);
          setEditingTitle(finalFileName);
        } catch (err) {
          console.error('Failed to rename draft:', err);
        } finally {
          isRenamingRef.current = false;
        }
        return;
      }

      // 未创建文件，title 有内容时创建
      let finalFileName = trimmedTitle;
      if (await fileExists(`drafts/${finalFileName}.md`)) {
        const randomSuffix = Math.floor(Math.random() * 90 + 10).toString();
        finalFileName = `${trimmedTitle}-${randomSuffix}`;
      }

      const result = await createDraftFile(finalFileName, localContentRef.current);
      if (result) {
        setFileId(result.fileId);
        setCurrentPath(result.path);
        setEditingTitle(finalFileName);
      }
    },
    [createDraftFile]
  );

  // title 变化时防抖处理（300ms 后执行创建/重命名）
  const handleTitleChange = useCallback(
    (newTitle: string) => {
      setEditingTitle(newTitle);

      // 清除之前的定时器
      if (titleTimeoutRef.current) {
        clearTimeout(titleTimeoutRef.current);
      }

      // 设置新的防抖定时器
      titleTimeoutRef.current = setTimeout(() => {
        doTitleAction(newTitle);
      }, 300);
    },
    [doTitleAction]
  );

  // 保存文件
  const doSave = useCallback(
    async (contentToSave: string) => {
      if (!currentPath) return;

      setSaveStatus('saving');
      if (statusTimeoutRef.current) {
        clearTimeout(statusTimeoutRef.current);
      }

      try {
        await writeFile(currentPath, contentToSave);
        setSaveStatus('success');
        setLastSavedAt(new Date());

        statusTimeoutRef.current = setTimeout(() => {
          setSaveStatus('idle');
        }, 2000);
      } catch (err) {
        console.error('Failed to save file:', err);
        setSaveStatus('error');

        statusTimeoutRef.current = setTimeout(() => {
          setSaveStatus('idle');
        }, 3000);
      }
    },
    [currentPath]
  );

  // 防抖保存
  const debouncedSave = useCallback(
    (newContent: string) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        doSave(newContent);
      }, 300);
    },
    [doSave]
  );

  // 内容变化处理
  const handleContentChange = useCallback(
    async (newContent: string) => {
      const previousContent = localContent;
      setLocalContent(newContent);

      // 文件未创建，且是第一次输入内容
      if (!fileId && !isCreatingRef.current && previousContent === '' && newContent !== '') {
        // 自动生成文件名
        const autoFileName = await generateDraftFileName();
        const result = await createDraftFile(autoFileName, newContent);
        if (result) {
          setFileId(result.fileId);
          setCurrentPath(result.path);
        }
        return;
      }

      // 文件已创建，触发保存
      if (currentPath) {
        debouncedSave(newContent);
      }
    },
    [fileId, currentPath, localContent, createDraftFile, debouncedSave]
  );

  // 返回前保存（清除防抖定时器，立即保存）
  const saveBeforeBack = useCallback(async () => {
    // 清除防抖定时器
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    if (titleTimeoutRef.current) {
      clearTimeout(titleTimeoutRef.current);
      titleTimeoutRef.current = null;
    }

    // 如果文件已创建，保存当前内容
    const path = currentPathRef.current;
    if (path) {
      await doSave(localContentRef.current);
    }
  }, [doSave]);

  // 手动保存并返回（菜单按钮用）
  const handleSave = useCallback(async () => {
    if (!currentPath) {
      safeGoBack();
      return;
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    await doSave(localContent);
    safeGoBack();
  }, [currentPath, localContent, doSave, safeGoBack]);

  // 删除文件
  const handleDelete = useCallback(async () => {
    if (!currentPath) {
      safeGoBack();
      return;
    }

    try {
      await deleteFile(currentPath);
      safeGoBack();
    } catch (err) {
      console.error('Failed to delete draft:', err);
    }
  }, [currentPath, safeGoBack]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
      if (titleTimeoutRef.current) clearTimeout(titleTimeoutRef.current);
    };
  }, []);

  const floatingHeaderHeight = insets.top + FLOATING_BUTTON_SIZE + FLOATING_BUTTON_MARGIN;

  return (
    <View className="bg-background flex-1">
      <Stack.Screen options={{ headerShown: false }} />

      {/* 悬浮按钮层 */}
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
        pointerEvents="box-none">
        <BackButton onBeforeBack={saveBeforeBack} />
        <MoreButton onSave={handleSave} onDelete={handleDelete} />
      </View>

      {/* 内容区域 */}
      <View style={{ flex: 1, paddingTop: floatingHeaderHeight }}>
        <View className="flex-1">
          {/* 标题输入框 */}
          <View className="px-4 pt-2 pb-3">
            <TitleInput
              ref={titleInputRef}
              value={editingTitle}
              onChangeText={handleTitleChange}
              placeholder="标题"
              returnKeyType="done"
              onSubmitEditing={() => titleInputRef.current?.blur()}
            />
          </View>

          {/* 分割线 */}
          <View className="bg-border/50 mx-4 h-px" />

          {/* 编辑器 */}
          <View className="flex-1">
            <EditorWithToolbar
              initialContent=""
              onContentChange={handleContentChange}
              placeholder="记录你的想法..."
            />
          </View>
        </View>
      </View>

      {/* 底部保存状态指示器 */}
      <SaveStatusIndicator status={saveStatus} lastSavedAt={lastSavedAt} />
    </View>
  );
}
