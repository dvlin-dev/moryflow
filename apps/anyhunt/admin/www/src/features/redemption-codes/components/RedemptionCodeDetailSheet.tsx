/**
 * [PROPS]: open, code, onOpenChange
 * [EMITS]: onOpenChange(open)
 * [POS]: Side sheet showing redemption code details + usage history
 */

import { Ticket } from 'lucide-react';
import {
  Badge,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@moryflow/ui';
import { formatRelativeTime } from '@moryflow/ui/lib';
import type { RedemptionCodeDetail } from '../types';
import { CODE_TYPE_BADGE_VARIANTS } from '../constants';

export interface RedemptionCodeDetailSheetProps {
  open: boolean;
  code: RedemptionCodeDetail | null;
  onOpenChange: (open: boolean) => void;
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{children}</span>
    </div>
  );
}

export function RedemptionCodeDetailSheet({
  open,
  code,
  onOpenChange,
}: RedemptionCodeDetailSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[560px] sm:max-w-none overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5" />
            Code Details
          </SheetTitle>
          <SheetDescription>
            {code ? <code className="font-mono">{code.code}</code> : 'No code selected'}
          </SheetDescription>
        </SheetHeader>

        {code && (
          <div className="mt-6 space-y-6">
            <div className="rounded-lg border p-4 space-y-1">
              <DetailRow label="Type">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${CODE_TYPE_BADGE_VARIANTS[code.type] ?? ''}`}
                >
                  {code.type}
                </span>
              </DetailRow>
              {code.type === 'CREDITS' && (
                <DetailRow label="Credits Amount">{code.creditsAmount ?? '-'}</DetailRow>
              )}
              {code.type === 'MEMBERSHIP' && (
                <>
                  <DetailRow label="Membership Tier">{code.membershipTier ?? '-'}</DetailRow>
                  <DetailRow label="Membership Days">{code.membershipDays ?? '-'}</DetailRow>
                </>
              )}
              <DetailRow label="Usage">
                {code.currentRedemptions}/{code.maxRedemptions}
              </DetailRow>
              <DetailRow label="Status">
                <Badge variant={code.isActive ? 'default' : 'secondary'}>
                  {code.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </DetailRow>
              <DetailRow label="Expires">
                {code.expiresAt ? new Date(code.expiresAt).toLocaleString() : 'Never'}
              </DetailRow>
              <DetailRow label="Created By">{code.createdBy}</DetailRow>
              <DetailRow label="Created">{formatRelativeTime(code.createdAt)}</DetailRow>
              {code.note && <DetailRow label="Note">{code.note}</DetailRow>}
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-3">
                Usage History ({code.usages?.length ?? 0})
              </h3>
              {code.usages && code.usages.length > 0 ? (
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User ID</TableHead>
                        <TableHead>Redeemed At</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Amount / Tier</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {code.usages.map((usage) => (
                        <TableRow key={usage.id}>
                          <TableCell className="font-mono text-xs">
                            {usage.userId.slice(0, 8)}...
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatRelativeTime(usage.redeemedAt)}
                          </TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${CODE_TYPE_BADGE_VARIANTS[usage.type] ?? ''}`}
                            >
                              {usage.type}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm">
                            {usage.type === 'CREDITS'
                              ? (usage.creditsAmount ?? '-')
                              : `${usage.membershipTier ?? '-'} / ${usage.membershipDays ?? '-'}d`}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">No usage history</p>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
