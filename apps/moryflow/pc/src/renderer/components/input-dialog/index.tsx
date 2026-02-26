/**
 * [PROPS]: InputDialogProps
 * [EMITS]: onConfirm/onCancel
 * [POS]: 通用输入对话框
 * [UPDATE]: 2026-02-26 - 引入 actionHandledRef，避免 onCancel/onConfirm 关闭链路重复触发
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@moryflow/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@moryflow/ui/components/dialog';
import { Input } from '@moryflow/ui/components/input';
import { useTranslation } from '@/lib/i18n';
import type { InputDialogProps } from './const';

export const InputDialog = ({
  open,
  title,
  description,
  defaultValue = '',
  placeholder,
  onConfirm,
  onCancel,
}: InputDialogProps) => {
  const { t } = useTranslation('common');
  const [value, setValue] = useState(defaultValue);
  const actionHandledRef = useRef(false);

  // 当对话框打开时重置值为默认值
  useEffect(() => {
    if (open) {
      setValue(defaultValue);
      actionHandledRef.current = false;
    }
  }, [open, defaultValue]);

  const handleConfirm = useCallback(() => {
    if (actionHandledRef.current) {
      return;
    }
    actionHandledRef.current = true;
    onConfirm(value);
    setValue('');
  }, [onConfirm, value]);

  const handleCancel = useCallback(() => {
    if (actionHandledRef.current) {
      return;
    }
    actionHandledRef.current = true;
    onCancel();
    setValue('');
  }, [onCancel]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirm();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          handleCancel();
        }
      }}
    >
      <DialogContent data-testid="input-dialog">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="py-4">
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            autoFocus
            data-testid="input-dialog-input"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} data-testid="input-dialog-cancel">
            {t('cancel')}
          </Button>
          <Button onClick={handleConfirm} data-testid="input-dialog-confirm">
            {t('confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
