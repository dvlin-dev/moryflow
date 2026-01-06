/**
 * 创建 Webhook 对话框
 */
import { useState } from 'react'
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
} from '@memai/ui/primitives'
import { useCreateWebhook } from '../hooks'
import { WEBHOOK_EVENTS, DEFAULT_WEBHOOK_EVENTS } from '../constants'
import type { WebhookEvent } from '../types'

interface CreateWebhookDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateWebhookDialog({
  open,
  onOpenChange,
}: CreateWebhookDialogProps) {
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [events, setEvents] = useState<WebhookEvent[]>(DEFAULT_WEBHOOK_EVENTS)

  const { mutate: create, isPending } = useCreateWebhook()

  const handleEventToggle = (event: WebhookEvent, checked: boolean) => {
    if (checked) {
      setEvents((prev) => [...prev, event])
    } else {
      setEvents((prev) => prev.filter((e) => e !== event))
    }
  }

  const handleCreate = () => {
    if (!name.trim() || !url.trim() || events.length === 0) return

    create(
      { name: name.trim(), url: url.trim(), events },
      {
        onSuccess: () => {
          handleClose()
        },
      }
    )
  }

  const handleClose = () => {
    setName('')
    setUrl('')
    setEvents(DEFAULT_WEBHOOK_EVENTS)
    onOpenChange(false)
  }

  const isValid = name.trim() && url.trim() && events.length > 0

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Webhook</DialogTitle>
          <DialogDescription>
            We'll send POST requests to your URL when specified events occur.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="e.g., Notification Service, Data Sync"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="url">Callback URL</Label>
            <Input
              id="url"
              type="url"
              placeholder="https://your-server.com/webhook"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">
              Must be an HTTPS URL
            </p>
          </div>

          <div className="space-y-2">
            <Label>Subscribe to Events</Label>
            <div className="space-y-2">
              {WEBHOOK_EVENTS.map((event) => (
                <div key={event.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={event.value}
                    checked={events.includes(event.value)}
                    onCheckedChange={(checked) =>
                      handleEventToggle(event.value, checked as boolean)
                    }
                  />
                  <label
                    htmlFor={event.value}
                    className="text-sm cursor-pointer"
                  >
                    {event.label}
                    <span className="text-muted-foreground ml-1">
                      ({event.value})
                    </span>
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
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!isValid || isPending}>
            {isPending ? 'Creating...' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
