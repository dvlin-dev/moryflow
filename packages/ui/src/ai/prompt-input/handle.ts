/**
 * [PROVIDES]: PromptInput 上下文与状态管理（文本 + 附件）
 * [DEPENDS]: React, nanoid, ai FileUIPart
 * [POS]: PromptInput 组件的基础状态层（含附件资源清理）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

'use client';

import type { FileUIPart } from 'ai';
import { nanoid } from 'nanoid';
import {
  createContext,
  createElement,
  type RefObject,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import type {
  AttachmentsContext,
  PromptInputControllerProps,
  PromptInputProviderProps,
} from './const';

const PromptInputController = createContext<PromptInputControllerProps | null>(null);
const ProviderAttachmentsContext = createContext<AttachmentsContext | null>(null);

export const LocalAttachmentsContext = createContext<AttachmentsContext | null>(null);

export const usePromptInputController = () => {
  const ctx = useContext(PromptInputController);
  if (!ctx) {
    throw new Error(
      'Wrap your component inside <PromptInputProvider> to use usePromptInputController().'
    );
  }
  return ctx;
};

export const useOptionalPromptInputController = () => useContext(PromptInputController);

export const useProviderAttachments = () => {
  const ctx = useContext(ProviderAttachmentsContext);
  if (!ctx) {
    throw new Error(
      'Wrap your component inside <PromptInputProvider> to use useProviderAttachments().'
    );
  }
  return ctx;
};

const useOptionalProviderAttachments = () => useContext(ProviderAttachmentsContext);

export const usePromptInputAttachments = () => {
  const provider = useOptionalProviderAttachments();
  const local = useContext(LocalAttachmentsContext);
  const context = provider ?? local;
  if (!context) {
    throw new Error(
      'usePromptInputAttachments must be used within a PromptInput or PromptInputProvider'
    );
  }
  return context;
};

export function PromptInputProvider({
  initialInput: initialTextInput = '',
  children,
}: PromptInputProviderProps) {
  const [textInput, setTextInput] = useState(initialTextInput);
  const clearInput = useCallback(() => setTextInput(''), []);

  const [attachments, setAttachments] = useState<(FileUIPart & { id: string })[]>([]);
  const attachmentsRef = useRef<(FileUIPart & { id: string })[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const openRef = useRef<() => void>(() => {});

  const add = useCallback((files: File[] | FileList) => {
    const incoming = Array.from(files);
    if (incoming.length === 0) {
      return;
    }

    setAttachments((prev) =>
      prev.concat(
        incoming.map((file) => ({
          id: nanoid(),
          type: 'file' as const,
          url: URL.createObjectURL(file),
          mediaType: file.type,
          filename: file.name,
        }))
      )
    );
  }, []);

  const remove = useCallback((id: string) => {
    setAttachments((prev) => {
      const found = prev.find((file) => file.id === id);
      if (found?.url) {
        URL.revokeObjectURL(found.url);
      }
      return prev.filter((file) => file.id !== id);
    });
  }, []);

  const clear = useCallback(() => {
    setAttachments((prev) => {
      for (const file of prev) {
        if (file.url) {
          URL.revokeObjectURL(file.url);
        }
      }
      return [];
    });
  }, []);

  useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);

  useEffect(
    () => () => {
      for (const file of attachmentsRef.current) {
        if (file.url) {
          URL.revokeObjectURL(file.url);
        }
      }
    },
    []
  );

  const openFileDialog = useCallback(() => {
    openRef.current?.();
  }, []);

  const __registerFileInput = useCallback(
    (ref: RefObject<HTMLInputElement | null>, open: () => void) => {
      fileInputRef.current = ref.current;
      openRef.current = open;
    },
    []
  );

  const attachmentsContext = useMemo<AttachmentsContext>(
    () => ({
      files: attachments,
      add,
      remove,
      clear,
      openFileDialog,
      fileInputRef,
    }),
    [attachments, add, remove, clear, openFileDialog]
  );

  const controller = useMemo<PromptInputControllerProps>(
    () => ({
      textInput: {
        value: textInput,
        setInput: setTextInput,
        clear: clearInput,
      },
      attachments: attachmentsContext,
      __registerFileInput,
    }),
    [textInput, clearInput, attachmentsContext, __registerFileInput]
  );

  return createElement(
    PromptInputController.Provider,
    { value: controller },
    createElement(ProviderAttachmentsContext.Provider, { value: attachmentsContext }, children)
  );
}
