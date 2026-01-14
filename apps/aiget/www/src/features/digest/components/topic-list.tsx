/**
 * [PROPS]: none (data fetched internally)
 * [POS]: Displays list of user's published topics with management actions
 */

import { useState } from 'react';
import { toast } from 'sonner';
import {
  MoreVerticalIcon,
  Edit01Icon,
  Delete01Icon,
  ViewIcon,
  Link01Icon,
  UserMultipleIcon,
} from '@hugeicons/core-free-icons';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Icon,
  Button,
  Badge,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Skeleton,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@aiget/ui';
import { useUserTopics, useDeleteTopic } from '../hooks';
import { EditTopicDialog } from './edit-topic-dialog';
import type { Topic, TopicVisibility } from '../types';

const visibilityConfig: Record<
  TopicVisibility,
  { label: string; variant: 'default' | 'secondary' | 'outline' }
> = {
  PUBLIC: { label: 'Public', variant: 'default' },
  UNLISTED: { label: 'Unlisted', variant: 'secondary' },
  PRIVATE: { label: 'Private', variant: 'outline' },
};

export function TopicList() {
  const { data, isLoading } = useUserTopics();
  const deleteMutation = useDeleteTopic();

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);

  const handleEditClick = (topic: Topic) => {
    setSelectedTopic(topic);
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (topic: Topic) => {
    setSelectedTopic(topic);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedTopic) return;
    try {
      await deleteMutation.mutateAsync(selectedTopic.id);
      setDeleteDialogOpen(false);
      setSelectedTopic(null);
    } catch {
      // Error handled by mutation
    }
  };

  const copyTopicUrl = (slug: string) => {
    const url = `${window.location.origin}/topics/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard');
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-3">
              <Skeleton className="h-5 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="mt-2 h-4 w-3/4" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const topics = data?.items ?? [];

  if (topics.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">
            No topics yet. Publish a subscription to create your first topic.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {topics.map((topic) => {
        const visConfig = visibilityConfig[topic.visibility];
        return (
          <Card key={topic.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-base">{topic.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">/{topic.slug}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={visConfig.variant}>{visConfig.label}</Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Icon icon={MoreVerticalIcon} className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {topic.visibility !== 'PRIVATE' && (
                        <DropdownMenuItem
                          onClick={() => window.open(`/topics/${topic.slug}`, '_blank')}
                        >
                          <Icon icon={ViewIcon} className="mr-2 h-4 w-4" />
                          View Topic
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => copyTopicUrl(topic.slug)}>
                        <Icon icon={Link01Icon} className="mr-2 h-4 w-4" />
                        Copy Link
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleEditClick(topic)}>
                        <Icon icon={Edit01Icon} className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleDeleteClick(topic)}
                        className="text-destructive"
                      >
                        <Icon icon={Delete01Icon} className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {topic.description && (
                <p className="mb-3 text-sm text-muted-foreground">{topic.description}</p>
              )}
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Icon icon={UserMultipleIcon} className="h-4 w-4" />
                  {topic.subscriberCount} subscribers
                </span>
                {topic.lastEditionAt && (
                  <span>
                    Last edition:{' '}
                    {new Date(topic.lastEditionAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                )}
              </div>
              {topic.interests.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {topic.interests.slice(0, 5).map((interest) => (
                    <Badge key={interest} variant="outline" className="text-xs">
                      {interest}
                    </Badge>
                  ))}
                  {topic.interests.length > 5 && (
                    <Badge variant="outline" className="text-xs">
                      +{topic.interests.length - 5} more
                    </Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      <EditTopicDialog
        topic={selectedTopic}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Topic</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{selectedTopic?.title}&quot;? This action cannot
              be undone. All subscribers will lose access to this topic.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
