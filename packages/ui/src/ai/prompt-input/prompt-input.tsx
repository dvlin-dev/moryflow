/**
 * [PROPS]: PromptInputProps - 输入框容器与附件处理（含错误回调）
 * [POS]: PromptInput 交互主体（拖拽、上传、提交）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

'use client';

import type { FileUIPart } from 'ai';
import { nanoid } from 'nanoid';
import {
  type ChangeEventHandler,
  type FormEventHandler,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { InputGroup } from '../../components/input-group';
import { cn } from '../../lib/utils';

import type { AttachmentsContext, PromptInputProps } from './const';
import { LocalAttachmentsContext, useOptionalPromptInputController } from './handle';

export const PromptInput = ({
  className,
  accept,
  multiple,
  globalDrop,
  syncHiddenInput,
  maxFiles,
  maxFileSize,
  onError,
  onSubmit,
  children,
  ...props
}: PromptInputProps) => {
  const controller = useOptionalPromptInputController();
  const usingProvider = Boolean(controller);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const anchorRef = useRef<HTMLSpanElement>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    const root = anchorRef.current?.closest('form');
    if (root instanceof HTMLFormElement) {
      formRef.current = root;
    }
  }, []);

  const [items, setItems] = useState<(FileUIPart & { id: string })[]>([]);
  const files = usingProvider ? controller!.attachments.files : items;

  const openFileDialogLocal = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const matchesAccept = useCallback(
    (file: File) => {
      if (!accept || accept.trim() === '') {
        return true;
      }

      const fileType = file.type.toLowerCase();
      const fileName = file.name.toLowerCase();
      const rules = accept
        .split(',')
        .map((rule) => rule.trim().toLowerCase())
        .filter(Boolean);

      return rules.some((rule) => {
        if (rule === '*/*') {
          return true;
        }
        if (rule.startsWith('.')) {
          return fileName.endsWith(rule);
        }
        if (rule.endsWith('/*')) {
          const prefix = rule.slice(0, -1);
          return fileType.startsWith(prefix);
        }
        return fileType === rule;
      });
    },
    [accept]
  );

  const addLocal = useCallback(
    (fileList: File[] | FileList) => {
      const incoming = Array.from(fileList);
      const accepted = incoming.filter((file) => matchesAccept(file));
      if (incoming.length && accepted.length === 0) {
        onError?.({
          code: 'accept',
          message: 'No files match the accepted types.',
        });
        return;
      }
      const withinSize = (file: File) => (maxFileSize ? file.size <= maxFileSize : true);
      const sized = accepted.filter(withinSize);
      if (accepted.length > 0 && sized.length === 0) {
        onError?.({
          code: 'max_file_size',
          message: 'All files exceed the maximum size.',
        });
        return;
      }

      setItems((prev) => {
        const capacity =
          typeof maxFiles === 'number' ? Math.max(0, maxFiles - prev.length) : undefined;
        const capped = typeof capacity === 'number' ? sized.slice(0, capacity) : sized;
        if (typeof capacity === 'number' && sized.length > capacity) {
          onError?.({
            code: 'max_files',
            message: 'Too many files. Some were not added.',
          });
        }
        const next: (FileUIPart & { id: string })[] = [];
        for (const file of capped) {
          next.push({
            id: nanoid(),
            type: 'file',
            url: URL.createObjectURL(file),
            mediaType: file.type,
            filename: file.name,
          });
        }
        return prev.concat(next);
      });
    },
    [matchesAccept, maxFiles, maxFileSize, onError]
  );

  const add = usingProvider
    ? (files: File[] | FileList) => controller!.attachments.add(files)
    : addLocal;

  const remove = usingProvider
    ? (id: string) => controller!.attachments.remove(id)
    : (id: string) =>
        setItems((prev) => {
          const found = prev.find((file) => file.id === id);
          if (found?.url) {
            URL.revokeObjectURL(found.url);
          }
          return prev.filter((file) => file.id !== id);
        });

  const clear = usingProvider
    ? () => controller!.attachments.clear()
    : () =>
        setItems((prev) => {
          for (const file of prev) {
            if (file.url) {
              URL.revokeObjectURL(file.url);
            }
          }
          return [];
        });

  const openFileDialog = usingProvider
    ? () => controller!.attachments.openFileDialog()
    : openFileDialogLocal;

  useEffect(() => {
    if (!usingProvider || !controller) {
      return;
    }
    controller.__registerFileInput(inputRef, () => inputRef.current?.click());
  }, [usingProvider, controller]);

  useEffect(() => {
    if (syncHiddenInput && inputRef.current && files.length === 0) {
      inputRef.current.value = '';
    }
  }, [files, syncHiddenInput]);

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;

    const onDragOver = (event: DragEvent) => {
      if (event.dataTransfer?.types?.includes('Files')) {
        event.preventDefault();
      }
    };
    const onDrop = (event: DragEvent) => {
      if (event.dataTransfer?.types?.includes('Files')) {
        event.preventDefault();
      }
      if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
        add(event.dataTransfer.files);
      }
    };
    form.addEventListener('dragover', onDragOver);
    form.addEventListener('drop', onDrop);
    return () => {
      form.removeEventListener('dragover', onDragOver);
      form.removeEventListener('drop', onDrop);
    };
  }, [add]);

  useEffect(() => {
    if (!globalDrop) return;

    const onDragOver = (event: DragEvent) => {
      if (event.dataTransfer?.types?.includes('Files')) {
        event.preventDefault();
      }
    };
    const onDrop = (event: DragEvent) => {
      if (event.dataTransfer?.types?.includes('Files')) {
        event.preventDefault();
      }
      if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
        add(event.dataTransfer.files);
      }
    };
    document.addEventListener('dragover', onDragOver);
    document.addEventListener('drop', onDrop);
    return () => {
      document.removeEventListener('dragover', onDragOver);
      document.removeEventListener('drop', onDrop);
    };
  }, [add, globalDrop]);

  useEffect(
    () => () => {
      if (!usingProvider) {
        for (const file of files) {
          if (file.url) {
            URL.revokeObjectURL(file.url);
          }
        }
      }
    },
    [usingProvider, files]
  );

  const handleChange: ChangeEventHandler<HTMLInputElement> = (event) => {
    if (event.currentTarget.files) {
      add(event.currentTarget.files);
    }
  };

  const ctx = useMemo<AttachmentsContext>(
    () => ({
      files: files.map((item) => ({ ...item, id: item.id })),
      add,
      remove,
      clear,
      openFileDialog,
      fileInputRef: inputRef,
    }),
    [files, add, remove, clear, openFileDialog]
  );

  const handleSubmit: FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();

    const form = event.currentTarget;
    const text = usingProvider
      ? controller!.textInput.value
      : (() => {
          const formData = new FormData(form);
          return (formData.get('message') as string) || '';
        })();

    const submit = async () => {
      let reportedConvertError = false;
      const convertedFiles = await Promise.all(
        files.map(async ({ id, ...item }) => {
          if (item.url && item.url.startsWith('blob:')) {
            try {
              return {
                ...item,
                url: await convertBlobUrlToDataUrl(item.url),
              };
            } catch (error) {
              if (!reportedConvertError) {
                reportedConvertError = true;
                onError?.({
                  code: 'convert',
                  message: 'Failed to process attachments.',
                });
              }
              return item;
            }
          }
          return item;
        })
      );

      try {
        await Promise.resolve(onSubmit({ text, files: convertedFiles }, event));
        clear();
        if (usingProvider) {
          controller!.textInput.clear();
        } else {
          form.reset();
        }
      } catch (error) {
        onError?.({
          code: 'submit',
          message: 'Failed to submit message.',
        });
      }
    };

    void submit();
  };

  const inner = (
    <>
      <span aria-hidden="true" className="hidden" ref={anchorRef} />
      <input
        accept={accept}
        aria-label="Upload files"
        className="hidden"
        multiple={multiple}
        onChange={handleChange}
        ref={inputRef}
        title="Upload files"
        type="file"
      />
      <form className={cn('w-full', className)} onSubmit={handleSubmit} {...props}>
        <InputGroup className="overflow-hidden">{children}</InputGroup>
      </form>
    </>
  );

  return usingProvider ? (
    inner
  ) : (
    <LocalAttachmentsContext.Provider value={ctx}>{inner}</LocalAttachmentsContext.Provider>
  );
};

const convertBlobUrlToDataUrl = async (url: string): Promise<string> => {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};
