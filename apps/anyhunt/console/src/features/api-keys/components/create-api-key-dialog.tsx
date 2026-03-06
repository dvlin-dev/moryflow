/**
 * [PROPS]: CreateApiKeyDialogProps
 * [POS]: 创建 API Key 并展示可复制的明文密钥（Lucide icons direct render）
 *
 * [PROTOCOL]: 本文件变更时，必须更新所属目录 CLAUDE.md
 */
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { TriangleAlert, Copy, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
} from '@moryflow/ui';
import { toast } from 'sonner';
import { useCreateApiKey } from '../hooks';
import { createApiKeyDefaults, createApiKeySchema, type CreateApiKeyFormValues } from '../schemas';

interface CreateApiKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type CreateApiKeyDialogViewState = 'form' | 'created';

function resolveDialogViewState(createdKey: string | null): CreateApiKeyDialogViewState {
  if (createdKey) {
    return 'created';
  }
  return 'form';
}

function getDialogHeaderByState(viewState: CreateApiKeyDialogViewState): {
  title: string;
  description: string;
} {
  switch (viewState) {
    case 'created':
      return {
        title: 'Save Your API Key',
        description:
          'Copy and save your API key now. You can also copy it later from the API Keys list.',
      };
    case 'form':
      return {
        title: 'Create API Key',
        description: 'Create a new API Key for your application.',
      };
    default:
      return {
        title: 'Create API Key',
        description: 'Create a new API Key for your application.',
      };
  }
}

function getCreateButtonLabel(isPending: boolean): string {
  if (isPending) {
    return 'Creating...';
  }
  return 'Create';
}

function CopyStatusIcon({ copied }: { copied: boolean }) {
  if (copied) {
    return <Check className="h-4 w-4 text-green-600" />;
  }
  return <Copy className="h-4 w-4" />;
}

export function CreateApiKeyDialog({ open, onOpenChange }: CreateApiKeyDialogProps) {
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { mutate: createKey, isPending } = useCreateApiKey();
  const form = useForm<CreateApiKeyFormValues>({
    resolver: zodResolver(createApiKeySchema),
    defaultValues: createApiKeyDefaults,
  });

  const handleCreate = form.handleSubmit((values) => {
    createKey(
      { name: values.name },
      {
        onSuccess: (result) => {
          setCreatedKey(result.key);
        },
      }
    );
  });

  const handleCopy = async () => {
    if (!createdKey) return;
    try {
      await navigator.clipboard.writeText(createdKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Copy failed, please copy manually');
    }
  };

  const handleClose = () => {
    form.reset(createApiKeyDefaults);
    setCreatedKey(null);
    setCopied(false);
    onOpenChange(false);
  };

  const viewState = resolveDialogViewState(createdKey);
  const dialogHeader = getDialogHeaderByState(viewState);

  const renderDialogBodyByState = () => {
    switch (viewState) {
      case 'created': {
        if (!createdKey) {
          return null;
        }

        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
              <TriangleAlert className="h-5 w-5 shrink-0" />
              <p className="text-sm">
                Keep this key secret. You can copy it later from the API Keys list.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Input value={createdKey} readOnly className="font-mono text-sm" />
              <Button type="button" variant="outline" size="icon" onClick={handleCopy}>
                <CopyStatusIcon copied={copied} />
              </Button>
            </div>
          </div>
        );
      }
      case 'form':
        return (
          <Form {...form}>
            <form onSubmit={handleCreate} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="name">Name</FormLabel>
                    <FormControl>
                      <Input
                        id="name"
                        placeholder="e.g., Production, Test App"
                        maxLength={50}
                        {...field}
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      Used to identify the purpose of this key
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {getCreateButtonLabel(isPending)}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        );
      default:
        return null;
    }
  };

  const renderFinalFooter = () => {
    if (viewState !== 'created') {
      return null;
    }

    return (
      <DialogFooter>
        <Button onClick={handleClose}>Done</Button>
      </DialogFooter>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{dialogHeader.title}</DialogTitle>
          <DialogDescription>{dialogHeader.description}</DialogDescription>
        </DialogHeader>

        {renderDialogBodyByState()}
        {renderFinalFooter()}
      </DialogContent>
    </Dialog>
  );
}
