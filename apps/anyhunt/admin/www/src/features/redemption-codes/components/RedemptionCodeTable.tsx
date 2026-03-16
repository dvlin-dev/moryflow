/**
 * [PROPS]: items, onView, onEdit, onDelete
 * [EMITS]: onView(item), onEdit(item), onDelete(id)
 * [POS]: Redemption codes table component
 */

import { Eye, Pencil, Trash2 } from 'lucide-react';
import {
  Badge,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@moryflow/ui';
import { formatRelativeTime } from '@moryflow/ui/lib';
import type { RedemptionCode } from '../types';
import { CODE_TYPE_BADGE_VARIANTS } from '../constants';

export interface RedemptionCodeTableProps {
  items: RedemptionCode[];
  onView: (item: RedemptionCode) => void;
  onEdit: (item: RedemptionCode) => void;
  onDelete: (id: string) => void;
}

export function RedemptionCodeTable({ items, onView, onEdit, onDelete }: RedemptionCodeTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Code</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Usage</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Expires</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell>
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">{item.code}</code>
            </TableCell>
            <TableCell>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${CODE_TYPE_BADGE_VARIANTS[item.type] ?? ''}`}
              >
                {item.type}
              </span>
            </TableCell>
            <TableCell className="text-sm">
              {item.currentRedemptions}/{item.maxRedemptions}
            </TableCell>
            <TableCell>
              <Badge variant={item.isActive ? 'default' : 'secondary'}>
                {item.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {item.expiresAt ? new Date(item.expiresAt).toLocaleDateString() : '-'}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {formatRelativeTime(item.createdAt)}
            </TableCell>
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-1">
                <Button variant="ghost" size="icon" onClick={() => onView(item)}>
                  <Eye className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => onEdit(item)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => onDelete(item.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
