/**
 * [PROPS]: isLoading, error, imageUrl
 * [EMITS]: none
 * [POS]: Playground result preview (Lucide icons direct render)
 */

import { CircleAlert, ArrowUpRight, Download, Loader } from 'lucide-react';
import { Button } from '@moryflow/ui';

interface ResultPreviewProps {
  isLoading: boolean;
  error: string | null;
  imageUrl: string | null;
}

export function ResultPreview({ isLoading, error, imageUrl }: ResultPreviewProps) {
  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center border border-border bg-muted/30">
        <div className="flex flex-col items-center gap-3">
          <Loader className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="font-mono text-sm text-muted-foreground">Capturing screenshot...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[400px] items-center justify-center border border-destructive/50 bg-destructive/5">
        <div className="flex flex-col items-center gap-3 px-4 text-center">
          <CircleAlert className="h-8 w-8 text-destructive" />
          <span className="font-mono text-sm text-destructive">{error}</span>
        </div>
      </div>
    );
  }

  if (imageUrl) {
    return (
      <div className="space-y-3">
        <div className="overflow-hidden border border-border">
          <img src={imageUrl} alt="Screenshot preview" className="w-full" />
        </div>
        <div className="flex gap-2">
          <a href={imageUrl} download="screenshot.png">
            <Button variant="outline" size="sm" className="font-mono">
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
          </a>
          <a href={imageUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="font-mono">
              <ArrowUpRight className="mr-2 h-4 w-4" />
              Open Full Size
            </Button>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[400px] items-center justify-center border border-dashed border-border bg-muted/30">
      <div className="flex flex-col items-center gap-2 px-4 text-center">
        <span className="font-mono text-sm text-muted-foreground">
          Enter a URL above to capture a screenshot
        </span>
        <span className="font-mono text-xs text-muted-foreground/70">
          No API key required for demo
        </span>
      </div>
    </div>
  );
}
