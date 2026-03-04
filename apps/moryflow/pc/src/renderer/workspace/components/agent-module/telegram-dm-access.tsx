/**
 * [PROPS]: pairingRequests, pairingPending, onRefreshPairingRequests, onApprove, onDeny
 * [EMITS]: none
 * [POS]: Telegram DM 访问策略 + 条件渲染 Allowlist / Pending Approvals
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
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
import { Loader, RefreshCw } from 'lucide-react';
import type { TelegramPairingRequestItem } from '@shared/ipc';
import { DM_POLICY_OPTIONS, type FormValues } from './telegram-form-schema';

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
  const dmPolicy = watch('dmPolicy');

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">DM Access</span>
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
                      {opt.label}
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
              <FormLabel className="text-xs">Allowed user IDs (one per line)</FormLabel>
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
            <span className="text-xs font-medium text-muted-foreground">Pending Approvals</span>
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
          <p className="text-xs text-muted-foreground">
            New users who message your bot will receive a pairing code. Approve their requests here.
          </p>
          {pairingRequests.length === 0 ? (
            <p className="text-xs italic text-muted-foreground/70">No pending requests.</p>
          ) : (
            <div className="space-y-1.5">
              {pairingRequests.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2"
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
                        <Loader className="mr-1.5 size-3.5 animate-spin" />
                      )}
                      Approve
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={Boolean(pairingPending[item.id])}
                      onClick={() => onDeny(item.id)}
                    >
                      {pairingPending[item.id] === 'deny' && (
                        <Loader className="mr-1.5 size-3.5 animate-spin" />
                      )}
                      Deny
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
