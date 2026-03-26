import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertCircle, Coins, FilterX } from 'lucide-react';
import { PageHeader, SimplePagination, TableSkeleton } from '@/components/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { usePagination } from '@/hooks';
import { useCreditLedger } from '@/features/credit-ledger';
import { formatDateTime } from '@/lib/format';
import type {
  CreditLedgerAnomalyCode,
  CreditLedgerEventType,
  CreditLedgerItem,
  CreditLedgerStatus,
} from '@/types/api';

const PAGE_SIZE = 25;

const EVENT_TYPE_OPTIONS = [
  'AI_CHAT',
  'AI_IMAGE',
  'SUBSCRIPTION_GRANT',
  'PURCHASED_GRANT',
  'REDEMPTION_GRANT',
  'ADMIN_GRANT',
] as const;

const STATUS_OPTIONS = ['APPLIED', 'SKIPPED', 'FAILED'] as const;

const ANOMALY_OPTIONS = [
  'ZERO_USAGE',
  'USAGE_MISSING',
  'ZERO_PRICE_CONFIG',
  'ZERO_CREDITS_WITH_USAGE',
  'SETTLEMENT_FAILED',
] as const;

type EventTypeFilter = '' | CreditLedgerEventType;
type StatusFilter = '' | CreditLedgerStatus;
type AnomalyFilter = '' | CreditLedgerAnomalyCode;

const isEventType = (value: string): value is CreditLedgerEventType =>
  EVENT_TYPE_OPTIONS.includes(value as CreditLedgerEventType);

const isStatus = (value: string): value is CreditLedgerStatus =>
  STATUS_OPTIONS.includes(value as CreditLedgerStatus);

const isAnomalyCode = (value: string): value is CreditLedgerAnomalyCode =>
  ANOMALY_OPTIONS.includes(value as CreditLedgerAnomalyCode);

const STATUS_CLASS: Record<string, string> = {
  APPLIED: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700',
  SKIPPED: 'border-amber-500/20 bg-amber-500/10 text-amber-700',
  FAILED: 'border-destructive/20 bg-destructive/10 text-destructive',
};

const deltaToneClass = (value: number) => {
  if (value > 0) {
    return 'text-emerald-600';
  }
  if (value < 0) {
    return 'text-foreground';
  }
  return 'text-muted-foreground';
};

const renderMeta = (item: CreditLedgerItem) => {
  const segments = [
    item.userEmail ?? item.userId,
    item.modelId,
    item.totalTokens ? `${item.totalTokens} tokens` : null,
    item.anomalyCode,
  ].filter(Boolean);

  return segments.join(' · ');
};

export default function CreditLedgerPage() {
  const [searchParams] = useSearchParams();
  const [userId, setUserId] = useState(searchParams.get('userId') ?? '');
  const [email, setEmail] = useState(searchParams.get('email') ?? '');
  const [eventType, setEventType] = useState<EventTypeFilter>('');
  const [status, setStatus] = useState<StatusFilter>('');
  const [anomalyCode, setAnomalyCode] = useState<AnomalyFilter>('');
  const [zeroDelta, setZeroDelta] = useState(false);
  const [hasTokens, setHasTokens] = useState(false);
  const { page, setPage, resetPage, getTotalPages } = usePagination({ pageSize: PAGE_SIZE });

  const { data, isLoading, error } = useCreditLedger({
    page,
    pageSize: PAGE_SIZE,
    userId: userId || undefined,
    email: email || undefined,
    eventType: eventType || undefined,
    status: status || undefined,
    anomalyCode: anomalyCode || undefined,
    zeroDelta: zeroDelta || undefined,
    hasTokens: hasTokens || undefined,
  });

  const items = data?.items ?? [];
  const totalPages = getTotalPages(data?.pagination.total ?? 0);

  const clearFilters = () => {
    setUserId('');
    setEmail('');
    setEventType('');
    setStatus('');
    setAnomalyCode('');
    setZeroDelta(false);
    setHasTokens(false);
    resetPage();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Credit Ledger"
        description="Inspect canonical credit movements, zero-delta rows, and settlement anomalies."
      />

      <div className="rounded-2xl border border-border/60 bg-card/90 p-4 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            value={userId}
            onChange={(event) => {
              setUserId(event.target.value);
              resetPage();
            }}
            placeholder="Filter by user ID"
            className="w-56"
          />
          <Input
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              resetPage();
            }}
            placeholder="Filter by email"
            className="w-56"
          />
          <Select
            value={eventType || 'all'}
            onValueChange={(value) => {
              setEventType(value === 'all' ? '' : isEventType(value) ? value : '');
              resetPage();
            }}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Event type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All events</SelectItem>
              {EVENT_TYPE_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={status || 'all'}
            onValueChange={(value) => {
              setStatus(value === 'all' ? '' : isStatus(value) ? value : '');
              resetPage();
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={anomalyCode || 'all'}
            onValueChange={(value) => {
              setAnomalyCode(value === 'all' ? '' : isAnomalyCode(value) ? value : '');
              resetPage();
            }}
          >
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Anomaly" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All anomalies</SelectItem>
              {ANOMALY_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant={zeroDelta ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setZeroDelta((value) => !value);
              resetPage();
            }}
          >
            Zero delta only
          </Button>
          <Button
            variant={hasTokens ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setHasTokens((value) => !value);
              resetPage();
            }}
          >
            Has tokens
          </Button>
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <FilterX className="mr-2 h-4 w-4" />
            Clear
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card/90 shadow-xs">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Summary</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Delta</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeleton
                columns={[
                  { width: 'w-36' },
                  { width: 'w-[32rem]' },
                  { width: 'w-24' },
                  { width: 'w-20' },
                ]}
                rows={8}
              />
            ) : null}

            {!isLoading && error ? (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-destructive">
                  Failed to load credit ledger.
                </TableCell>
              </TableRow>
            ) : null}

            {!isLoading && !error && items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-12 text-center text-muted-foreground">
                  <Coins className="mx-auto mb-3 h-10 w-10" />
                  No ledger rows match the current filters.
                </TableCell>
              </TableRow>
            ) : null}

            {!isLoading && !error
              ? items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateTime(item.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{item.summary}</div>
                        <div className="text-xs text-muted-foreground">{renderMeta(item)}</div>
                        {item.errorMessage ? (
                          <div className="inline-flex items-center gap-1 text-xs text-destructive">
                            <AlertCircle className="h-3.5 w-3.5" />
                            {item.errorMessage}
                          </div>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={STATUS_CLASS[item.status] ?? ''}>
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className={`text-right font-semibold ${deltaToneClass(item.creditsDelta)}`}
                    >
                      {item.creditsDelta > 0 ? `+${item.creditsDelta}` : item.creditsDelta}
                    </TableCell>
                  </TableRow>
                ))
              : null}
          </TableBody>
        </Table>
      </div>

      <SimplePagination page={page} totalPages={Math.max(totalPages, 1)} onPageChange={setPage} />
    </div>
  );
}
