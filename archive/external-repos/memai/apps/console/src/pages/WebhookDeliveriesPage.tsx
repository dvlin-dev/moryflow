/**
 * Webhook 投递日志页面
 * 查看 Webhook 投递历史
 */
import { useState } from 'react'
import { PageHeader } from '@memai/ui/composed'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Badge,
  Skeleton,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@memai/ui/primitives'
import { formatRelativeTime } from '@memai/ui/lib'
import { ChevronLeft, ChevronRight, Send, CheckCircle2, XCircle } from 'lucide-react'
import { useWebhooks, useWebhookDeliveries } from '@/features/webhooks'

const PAGE_SIZE = 20

export default function WebhookDeliveriesPage() {
  const [webhookFilter, setWebhookFilter] = useState<string>('')
  const [page, setPage] = useState(0)

  const { data: webhooks } = useWebhooks()
  const { data, isLoading } = useWebhookDeliveries({
    webhookId: webhookFilter || undefined,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  })

  const deliveries = data?.deliveries ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  const handlePrevPage = () => {
    setPage((p) => Math.max(0, p - 1))
  }

  const handleNextPage = () => {
    setPage((p) => Math.min(totalPages - 1, p + 1))
  }

  const handleFilterChange = () => {
    setPage(0)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Delivery Logs"
        description="View webhook delivery history and debug failed deliveries"
      />

      <Card>
        <CardHeader>
          <CardTitle>Delivery History</CardTitle>
          <CardDescription>
            All webhook delivery attempts. Failed deliveries show error details.
            Total: {total} deliveries
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Select
              value={webhookFilter}
              onValueChange={(value) => {
                setWebhookFilter(value === 'all' ? '' : value)
                handleFilterChange()
              }}
            >
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Filter by webhook" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Webhooks</SelectItem>
                {webhooks?.map((webhook) => (
                  <SelectItem key={webhook.id} value={webhook.id}>
                    {webhook.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !deliveries.length ? (
            <div className="text-center py-12">
              <Send className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-2">No deliveries yet</p>
              <p className="text-sm text-muted-foreground">
                Webhook deliveries will appear here when events are triggered.
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Webhook</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>HTTP Status</TableHead>
                    <TableHead>Latency</TableHead>
                    <TableHead>Attempts</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deliveries.map((delivery) => (
                    <TableRow key={delivery.id}>
                      <TableCell>
                        {delivery.success ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        {delivery.webhookName}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{delivery.event}</Badge>
                      </TableCell>
                      <TableCell>
                        {delivery.statusCode ? (
                          <Badge
                            variant={
                              delivery.statusCode >= 200 && delivery.statusCode < 300
                                ? 'default'
                                : 'destructive'
                            }
                          >
                            {delivery.statusCode}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {delivery.latencyMs !== null ? (
                          <span className="text-sm">{delivery.latencyMs}ms</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{delivery.attempts}</span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatRelativeTime(delivery.createdAt)}
                      </TableCell>
                      <TableCell>
                        {delivery.error ? (
                          <span
                            className="text-sm text-red-600 max-w-[200px] truncate block"
                            title={delivery.error}
                          >
                            {delivery.error}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {page * PAGE_SIZE + 1} -{' '}
                    {Math.min((page + 1) * PAGE_SIZE, total)} of {total}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePrevPage}
                      disabled={page === 0}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNextPage}
                      disabled={page >= totalPages - 1}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
