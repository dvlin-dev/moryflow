/**
 * 编辑 Webhook 对话框
 */
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  Label,
  Checkbox,
} from '@moryflow/ui';
import { useUpdateWebhook } from '../hooks';
import { WEBHOOK_EVENTS } from '../constants';
import type { Webhook, WebhookEvent } from '../types';

interface EditWebhookDialogProps {
  apiKey: string;
  webhook: Webhook | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditWebhookDialog({ apiKey, webhook, open, onOpenChange }: EditWebhookDialogProps) {
  const handleClose = () => {
    onOpenChange(false);
  };

  if (!webhook) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Webhook</DialogTitle>
            <DialogDescription>No webhook selected.</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <EditWebhookForm key={webhook.id} apiKey={apiKey} webhook={webhook} onClose={handleClose} />
      </DialogContent>
    </Dialog>
  );
}

interface EditWebhookFormProps {
  apiKey: string;
  webhook: Webhook;
  onClose: () => void;
}

function EditWebhookForm({ apiKey, webhook, onClose }: EditWebhookFormProps) {
  const [name, setName] = useState(webhook.name);
  const [url, setUrl] = useState(webhook.url);
  const [events, setEvents] = useState<WebhookEvent[]>(webhook.events);

  const { mutate: update, isPending } = useUpdateWebhook(apiKey);

  const handleEventToggle = (event: WebhookEvent, checked: boolean) => {
    if (checked) {
      setEvents((prev) => [...prev, event]);
    } else {
      setEvents((prev) => prev.filter((e) => e !== event));
    }
  };

  const handleUpdate = () => {
    if (!apiKey || !name.trim() || !url.trim() || events.length === 0) return;

    update(
      { id: webhook.id, data: { name: name.trim(), url: url.trim(), events } },
      {
        onSuccess: () => {
          onClose();
        },
      }
    );
  };

  const isValid = name.trim() && url.trim() && events.length > 0;

  return (
    <>
      <DialogHeader>
        <DialogTitle>Edit Webhook</DialogTitle>
        <DialogDescription>Modify webhook configuration.</DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="edit-name">Name</Label>
          <Input
            id="edit-name"
            placeholder="e.g., Notification Service, Data Sync"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-url">Callback URL</Label>
          <Input
            id="edit-url"
            type="url"
            placeholder="https://your-server.com/webhook"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            maxLength={500}
          />
        </div>

        <div className="space-y-2">
          <Label>Subscribe to Events</Label>
          <div className="space-y-2">
            {WEBHOOK_EVENTS.map((event) => (
              <div key={event.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`edit-${event.value}`}
                  checked={events.includes(event.value)}
                  onCheckedChange={(checked) => handleEventToggle(event.value, checked as boolean)}
                />
                <label htmlFor={`edit-${event.value}`} className="text-sm cursor-pointer">
                  {event.label}
                  <span className="text-muted-foreground ml-1">({event.value})</span>
                </label>
              </div>
            ))}
          </div>
          {events.length === 0 && (
            <p className="text-xs text-destructive">Please select at least one event</p>
          )}
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleUpdate} disabled={!isValid || isPending}>
          {isPending ? 'Saving...' : 'Save'}
        </Button>
      </DialogFooter>
    </>
  );
}
