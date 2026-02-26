import { CircleAlert, CircleCheck, File, Loader } from 'lucide-react';
import { Input } from '@moryflow/ui/components/input';
import { Label } from '@moryflow/ui/components/label';
import { Progress } from '@moryflow/ui/components/progress';
import { cn } from '@/lib/utils';
import type { BuildProgressEvent } from '../../../shared/ipc/site-publish';

type PublishConfigModel = {
  sourcePaths: string[];
  subdomain: string;
  subdomainValid: boolean | null;
  subdomainMessage: string;
  checkingSubdomain: boolean;
  title: string;
  description: string;
};

type PublishConfigActions = {
  onSubdomainChange: (nextValue: string) => void;
  onTitleChange: (nextValue: string) => void;
  onDescriptionChange: (nextValue: string) => void;
};

type PublishConfigStepProps = {
  model: PublishConfigModel;
  actions: PublishConfigActions;
};

export const PublishConfigStep = ({ model, actions }: PublishConfigStepProps) => (
  <div className="space-y-4 py-4">
    <div className="rounded-lg bg-muted/50 p-3">
      <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
        <File className="size-4" />
        <span>Content to publish</span>
      </div>
      <div className="text-sm">
        {model.sourcePaths.length === 1 ? (
          <span className="font-medium">{model.sourcePaths[0].split('/').pop()}</span>
        ) : (
          <span className="font-medium">{model.sourcePaths.length} files or folders</span>
        )}
      </div>
    </div>

    <div className="space-y-2">
      <Label htmlFor="subdomain">Site address</Label>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Input
            id="subdomain"
            value={model.subdomain}
            onChange={(event) => actions.onSubdomainChange(event.target.value)}
            placeholder="my-site"
            className={cn(
              'pr-8',
              model.subdomainValid === true && 'border-green-500',
              model.subdomainValid === false && 'border-red-500'
            )}
          />
          {model.checkingSubdomain && (
            <Loader className="absolute right-2 top-2.5 size-4 animate-spin text-muted-foreground" />
          )}
          {!model.checkingSubdomain && model.subdomainValid === true && (
            <CircleCheck className="absolute right-2 top-2.5 size-4 text-green-500" />
          )}
          {!model.checkingSubdomain && model.subdomainValid === false && (
            <CircleAlert className="absolute right-2 top-2.5 size-4 text-red-500" />
          )}
        </div>
        <span className="text-sm text-muted-foreground">.moryflow.app</span>
      </div>
      {model.subdomainMessage && (
        <p className={cn('text-xs', model.subdomainValid === true ? 'text-green-600' : 'text-red-600')}>
          {model.subdomainMessage}
        </p>
      )}
    </div>

    <div className="space-y-2">
      <Label htmlFor="title">Site title</Label>
      <Input
        id="title"
        value={model.title}
        onChange={(event) => actions.onTitleChange(event.target.value)}
        placeholder="My site"
      />
    </div>

    <div className="space-y-2">
      <Label htmlFor="description">Site description (optional)</Label>
      <Input
        id="description"
        value={model.description}
        onChange={(event) => actions.onDescriptionChange(event.target.value)}
        placeholder="A short description of your site..."
      />
    </div>
  </div>
);

type PublishProgressStepProps = {
  progress: BuildProgressEvent | null;
  progressPercent: number;
};

export const PublishProgressStep = ({ progress, progressPercent }: PublishProgressStepProps) => (
  <div className="space-y-4 py-8">
    <div className="flex flex-col items-center gap-4">
      <Loader className="size-8 animate-spin text-primary" />
      <div className="text-center">
        <p className="font-medium">{progress?.message || 'Publishing...'}</p>
        <p className="text-sm text-muted-foreground">
          {progress?.phase === 'scanning' && 'Scanning files'}
          {progress?.phase === 'rendering' && 'Rendering pages'}
          {progress?.phase === 'uploading' && 'Uploading files'}
        </p>
      </div>
    </div>
    <Progress value={progressPercent} className="w-full" />
  </div>
);

type PublishSuccessStepProps = {
  publishedUrl: string;
};

export const PublishSuccessStep = ({ publishedUrl }: PublishSuccessStepProps) => (
  <div className="space-y-4 py-8">
    <div className="flex flex-col items-center gap-4">
      <div className="flex size-12 items-center justify-center rounded-full bg-green-100">
        <CircleCheck className="size-6 text-green-600" />
      </div>
      <div className="text-center">
        <p className="font-medium">Published successfully!</p>
        <a href={publishedUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
          {publishedUrl}
        </a>
      </div>
    </div>
  </div>
);

type PublishErrorStepProps = {
  errorMessage: string;
};

export const PublishErrorStep = ({ errorMessage }: PublishErrorStepProps) => (
  <div className="space-y-4 py-8">
    <div className="flex flex-col items-center gap-4">
      <div className="flex size-12 items-center justify-center rounded-full bg-red-100">
        <CircleAlert className="size-6 text-red-600" />
      </div>
      <div className="text-center">
        <p className="font-medium text-red-600">Publishing failed</p>
        <p className="text-sm text-muted-foreground">{errorMessage}</p>
      </div>
    </div>
  </div>
);

