/**
 * [PROPS]: pairingRequests, pairingPending, onRefreshPairingRequests, onApprove, onDeny
 * [EMITS]: none
 * [POS]: Telegram DM 访问策略 + 条件渲染 Allowlist / Pending Approvals
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { useFormContext } from 'react-hook-form';
import { Button } from '@moryflow/ui/components/button';
import { Textarea } from '@moryflow/ui/components/textarea';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@moryflow/ui/components/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@moryflow/ui/components/select';
import { LoaderCircle, RefreshCw } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import type { TelegramPairingRequestItem } from '@shared/ipc';
import { DM_POLICY_OPTIONS, type FormValues } from './telegram-form-schema';

const DM_POLICY_LABEL_KEYS = {
  pairing: 'telegramDmPolicyApproval',
  allowlist: 'telegramDmPolicySpecific',
  open: 'telegramDmPolicyAnyone',
  disabled: 'telegramDmPolicyNobody',
} as const;

type Props = {
  pairingRequests: TelegramPairingRequestItem[];
  pairingPending: Record<string, 'approve' | 'deny'>;
  onRefreshPairingRequests: () => void;
  onApprove: (id: string) => void;
  onDeny: (id: string) => void;
};

export const TelegramDmAccess = ({
  pairingRequests,
  pairingPending,
  onRefreshPairingRequests,
  onApprove,
  onDeny,
}: Props) => {
  const { control, watch } = useFormContext<FormValues>();
  const { t } = useTranslation('workspace');
  const dmPolicy = watch('dmPolicy');

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{t('telegramDmAccess')}</span>
        <FormField
          control={control}
          name="dmPolicy"
          render={({ field }) => (
            <FormItem className="w-44">
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {DM_POLICY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {t(DM_POLICY_LABEL_KEYS[opt.value])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />
      </div>

      {dmPolicy === 'allowlist' && (
        <FormField
          control={control}
          name="allowFromText"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">{t('telegramAllowedUserIds')}</FormLabel>
              <FormControl>
                <Textarea {...field} rows={2} placeholder="123456789" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {dmPolicy === 'pairing' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              {t('telegramPendingApprovals')}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-1.5"
              onClick={onRefreshPairingRequests}
            >
              <RefreshCw className="size-3" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">{t('telegramPairingDescription')}</p>
          {pairingRequests.length === 0 ? (
            <p className="text-xs italic text-muted-foreground">{t('telegramNoPendingRequests')}</p>
          ) : (
            <div className="space-y-1.5">
              {pairingRequests.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-card px-3 py-2"
                >
                  <div className="flex items-center gap-3 text-xs">
                    <span>{item.senderId}</span>
                    <span className="text-muted-foreground">{item.code}</span>
                    <span className="text-muted-foreground">
                      {new Date(item.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      disabled={Boolean(pairingPending[item.id])}
                      onClick={() => onApprove(item.id)}
                    >
                      {pairingPending[item.id] === 'approve' && (
                        <LoaderCircle className="mr-1.5 size-3.5 animate-spin" />
                      )}
                      {t('telegramApprove')}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={Boolean(pairingPending[item.id])}
                      onClick={() => onDeny(item.id)}
                    >
                      {pairingPending[item.id] === 'deny' && (
                        <LoaderCircle className="mr-1.5 size-3.5 animate-spin" />
                      )}
                      {t('telegramDeny')}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
