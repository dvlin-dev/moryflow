/**
 * [PROPS]: none
 * [EMITS]: create/cancel transcript task actions
 * [POS]: Console 视频转写测试页（Session API）
 *
 * [PROTOCOL]: 本文件变更时，需同步更新 apps/anyhunt/console/CLAUDE.md
 */

import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader, RefreshCw, SquareX } from 'lucide-react';
import { toast } from 'sonner';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  PageHeader,
  Skeleton,
} from '@anyhunt/ui';
import {
  videoTranscriptFormSchema,
  useCancelVideoTranscriptTask,
  useCreateVideoTranscriptTask,
  useVideoTranscriptTask,
  useVideoTranscriptTasks,
  type VideoTranscriptFormValues,
  type VideoTranscriptTask,
} from '@/features/video-transcript-playground';

const PAGE_SIZE = 20;
const TERMINAL_STATUSES = new Set(['COMPLETED', 'FAILED', 'CANCELLED']);

function getStatusBadgeVariant(status: VideoTranscriptTask['status']) {
  if (status === 'COMPLETED') {
    return 'default';
  }
  if (status === 'FAILED' || status === 'CANCELLED') {
    return 'destructive';
  }
  return 'secondary';
}

function parseRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function buildArtifactLinks(artifacts: unknown) {
  const record = parseRecord(artifacts);
  const candidates: Array<{ label: string; key: string }> = [
    { label: 'Video', key: 'videoUrl' },
    { label: 'Audio', key: 'audioUrl' },
    { label: 'Transcript TXT', key: 'textUrl' },
    { label: 'Transcript SRT', key: 'srtUrl' },
    { label: 'Transcript JSON', key: 'jsonUrl' },
  ];

  return candidates
    .map((candidate) => {
      const value = record[candidate.key];
      if (typeof value !== 'string' || !value.trim()) {
        return null;
      }
      return {
        label: candidate.label,
        url: value,
      };
    })
    .filter((item): item is { label: string; url: string } => item !== null);
}

function extractTranscriptText(result: unknown): string {
  const record = parseRecord(result);
  const text = record.text;
  if (typeof text === 'string') {
    return text;
  }
  return '';
}

export default function VideoTranscriptPage() {
  const [page, setPage] = useState(1);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const form = useForm<VideoTranscriptFormValues>({
    resolver: zodResolver(videoTranscriptFormSchema),
    defaultValues: {
      url: '',
    },
  });

  const {
    data: taskList,
    isLoading: isTaskListLoading,
    refetch: refetchTaskList,
  } = useVideoTranscriptTasks(page, PAGE_SIZE);

  const createTaskMutation = useCreateVideoTranscriptTask();
  const cancelTaskMutation = useCancelVideoTranscriptTask();

  const effectiveSelectedTaskId = useMemo(() => {
    if (selectedTaskId) {
      return selectedTaskId;
    }
    return taskList?.items[0]?.id ?? null;
  }, [selectedTaskId, taskList?.items]);

  const { data: taskDetail, isLoading: isTaskDetailLoading } =
    useVideoTranscriptTask(effectiveSelectedTaskId);

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      const created = await createTaskMutation.mutateAsync({ url: values.url.trim() });
      toast.success('Task created');
      setSelectedTaskId(created.taskId);
      form.reset({ url: values.url.trim() });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create task');
    }
  });

  const handleCancel = async (taskId: string) => {
    try {
      await cancelTaskMutation.mutateAsync(taskId);
      toast.success('Task cancelled');
      if (effectiveSelectedTaskId === taskId) {
        await refetchTaskList();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to cancel task');
    }
  };

  const artifactLinks = buildArtifactLinks(taskDetail?.artifacts);
  const transcriptText = extractTranscriptText(taskDetail?.result);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Video Transcript"
        description="Submit a video URL and track local/cloud fallback transcription progress."
      />

      <Card>
        <CardHeader>
          <CardTitle>Create Task</CardTitle>
          <CardDescription>
            Supported platforms: Douyin, Bilibili, Xiaohongshu, YouTube.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={handleSubmit}
              className="flex flex-col gap-3 md:flex-row md:items-start"
            >
              <FormField
                control={form.control}
                name="url"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel>Video URL</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://www.youtube.com/watch?v=..."
                        disabled={createTaskMutation.isPending}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="md:mt-8" disabled={createTaskMutation.isPending}>
                {createTaskMutation.isPending ? (
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Submit
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle>Tasks</CardTitle>
                <CardDescription>Latest submitted tasks (auto refresh every 5s).</CardDescription>
              </div>
              <Button variant="outline" size="icon" onClick={() => refetchTaskList()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {isTaskListLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((index) => (
                  <Skeleton key={index} className="h-20" />
                ))}
              </div>
            ) : taskList?.items.length ? (
              <>
                {taskList.items.map((task) => {
                  const isSelected = task.id === effectiveSelectedTaskId;
                  const canCancel = !TERMINAL_STATUSES.has(task.status);

                  return (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => setSelectedTaskId(task.id)}
                      className={`w-full rounded-lg border p-3 text-left transition-colors ${
                        isSelected ? 'border-primary bg-muted/30' : 'hover:bg-muted/20'
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={getStatusBadgeVariant(task.status)}>{task.status}</Badge>
                        {task.executor ? <Badge variant="outline">{task.executor}</Badge> : null}
                        <span className="text-xs text-muted-foreground">{task.platform}</span>
                      </div>
                      <p className="mt-2 line-clamp-2 break-all text-sm">{task.sourceUrl}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {new Date(task.createdAt).toLocaleString('zh-CN')}
                        </span>
                        {canCancel ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={cancelTaskMutation.isPending}
                            onClick={(event) => {
                              event.stopPropagation();
                              void handleCancel(task.id);
                            }}
                          >
                            <SquareX className="mr-1 h-4 w-4" />
                            Cancel
                          </Button>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
                <div className="flex items-center justify-between pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  >
                    Previous
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    Page {taskList.pagination.page} / {taskList.pagination.totalPages || 1}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= (taskList.pagination.totalPages || 1)}
                    onClick={() => setPage((prev) => prev + 1)}
                  >
                    Next
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No tasks yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Task Detail</CardTitle>
            <CardDescription>Status, executor, artifacts and transcript preview.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isTaskDetailLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((index) => (
                  <Skeleton key={index} className="h-16" />
                ))}
              </div>
            ) : taskDetail ? (
              <>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <p className="text-sm font-medium">{taskDetail.status}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Executor</p>
                    <p className="text-sm font-medium">{taskDetail.executor ?? '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Platform</p>
                    <p className="text-sm font-medium">{taskDetail.platform}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Created At</p>
                    <p className="text-sm font-medium">
                      {new Date(taskDetail.createdAt).toLocaleString('zh-CN')}
                    </p>
                  </div>
                </div>

                {taskDetail.error ? (
                  <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                    {taskDetail.error}
                  </div>
                ) : null}

                <div className="space-y-2">
                  <p className="text-sm font-medium">Artifacts</p>
                  {artifactLinks.length ? (
                    <div className="flex flex-wrap gap-2">
                      {artifactLinks.map((item) => (
                        <a
                          key={item.label}
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-md border px-3 py-1 text-xs hover:bg-muted"
                        >
                          {item.label}
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No artifact links yet.</p>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Transcript Preview</p>
                  <div className="max-h-72 overflow-auto rounded-md border bg-muted/30 p-3 text-sm leading-6">
                    {transcriptText || 'No transcript text yet.'}
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Select a task to view details.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
