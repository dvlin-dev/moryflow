/**
 * [PROPS]: InputDialogProps
 * [EMITS]: onConfirm/onCancel
 * [POS]: 通用输入对话框
 */

import { useEffect, useState } from 'react';
import { Button } from '@anyhunt/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@anyhunt/ui/components/dialog';
import { Input } from '@anyhunt/ui/components/input';
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

  // 当对话框打开时重置值为默认值
  useEffect(() => {
    if (open) {
      setValue(defaultValue);
    }
  }, [open, defaultValue]);

  const handleConfirm = () => {
    onConfirm(value);
    setValue('');
  };

  const handleCancel = () => {
    onCancel();
    setValue('');
  };

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
    <Dialog open={open} onOpenChange={(open) => !open && handleCancel()}>
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
