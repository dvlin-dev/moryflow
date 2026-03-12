import { Brain, FileText, LoaderCircle, MessagesSquare } from 'lucide-react';
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@moryflow/ui/components/command';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@moryflow/ui/components/dialog';
import { cn } from '@moryflow/ui/lib/utils';
import { useGlobalSearch } from './use-global-search';
import type { GlobalSearchPanelProps } from './const';
import { isMemorySearchFileOpenable } from '../../workspace/components/memory/helpers';

const resolveFileSubline = (relativePath: string, snippet: string) => {
  if (snippet.trim().length > 0) {
    return snippet;
  }
  return relativePath;
};

const resolveThreadSubline = (snippet: string) => {
  if (snippet.trim().length > 0) {
    return snippet;
  }
  return 'Open thread';
};

export const GlobalSearchPanel = ({
  open,
  onOpenChange,
  onOpenFile,
  onOpenThread,
  onOpenMemoryFile,
  onOpenMemoryFact,
}: GlobalSearchPanelProps) => {
  const {
    query,
    setQuery,
    loading,
    error,
    localUnavailable,
    memoryUnavailable,
    files,
    threads,
    memoryFiles,
    memoryFacts,
    hasEnoughQuery,
  } = useGlobalSearch(open);

  const hasResults =
    files.length > 0 || threads.length > 0 || memoryFiles.length > 0 || memoryFacts.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader className="sr-only">
        <DialogTitle>Global search</DialogTitle>
        <DialogDescription>Search files and threads.</DialogDescription>
      </DialogHeader>
      <DialogContent className="overflow-hidden p-0 sm:max-w-xl" showCloseButton={false}>
        <Command shouldFilter={false} loop>
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder="Search files or threads..."
            autoFocus
          />
          <CommandList className="max-h-[420px]">
            {!hasEnoughQuery ? (
              <div className="px-4 py-6 text-sm text-muted-foreground">
                Type at least 2 characters to start searching.
              </div>
            ) : null}

            {loading ? (
              <div className="flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground">
                <LoaderCircle className="size-4 animate-spin" />
                Searching...
              </div>
            ) : null}

            {error ? <div className="px-4 py-6 text-sm text-destructive">{error}</div> : null}

            {!loading && !error && hasEnoughQuery && localUnavailable ? (
              <div className="px-4 py-3 text-sm text-muted-foreground">
                Local search unavailable. Showing memory results only.
              </div>
            ) : null}

            {!loading && !error && hasEnoughQuery && memoryUnavailable ? (
              <div className="px-4 py-3 text-sm text-muted-foreground">{memoryUnavailable}</div>
            ) : null}

            {!loading && !error && hasEnoughQuery && !hasResults ? (
              <div className="px-4 py-6 text-sm text-muted-foreground">
                No matching files, threads, or memory results.
              </div>
            ) : null}

            {!loading && !error && hasEnoughQuery && threads.length > 0 ? (
              <CommandGroup heading="Threads">
                {threads.map((thread) => (
                  <CommandItem
                    key={thread.docId}
                    value={`thread-${thread.sessionId}-${thread.title}`}
                    onSelect={() => {
                      onOpenThread(thread);
                      onOpenChange(false);
                    }}
                  >
                    <MessagesSquare className="size-4" />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate">{thread.title}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {resolveThreadSubline(thread.snippet)}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}

            {!loading && !error && hasEnoughQuery && files.length > 0 ? (
              <CommandGroup heading="Files">
                {files.map((file) => (
                  <CommandItem
                    key={file.docId}
                    value={`file-${file.relativePath}-${file.fileName}`}
                    onSelect={() => {
                      onOpenFile(file);
                      onOpenChange(false);
                    }}
                  >
                    <FileText className="size-4" />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate">{file.fileName || file.relativePath}</span>
                      <span
                        className={cn(
                          'truncate text-xs text-muted-foreground',
                          file.snippet.length === 0 && 'font-mono'
                        )}
                      >
                        {resolveFileSubline(file.relativePath, file.snippet)}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}

            {!loading && !error && hasEnoughQuery && memoryFiles.length > 0 ? (
              <CommandGroup heading="Memory Files">
                {memoryFiles.map((file) => {
                  const openable = isMemorySearchFileOpenable(file);
                  return (
                    <CommandItem
                      key={file.id}
                      value={`memory-file-${file.sourceId}-${file.title}`}
                      disabled={!openable}
                      onSelect={() => {
                        if (!openable) {
                          return;
                        }
                        onOpenMemoryFile(file);
                        onOpenChange(false);
                      }}
                    >
                      <FileText className="size-4" />
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate">{file.title}</span>
                        <span className="truncate text-xs text-muted-foreground">
                          {!openable
                            ? 'Not available locally'
                            : file.snippet || file.path || 'Open memory file'}
                        </span>
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ) : null}

            {!loading && !error && hasEnoughQuery && memoryFacts.length > 0 ? (
              <CommandGroup heading="Facts">
                {memoryFacts.map((fact) => (
                  <CommandItem
                    key={fact.id}
                    value={`memory-fact-${fact.id}-${fact.text}`}
                    onSelect={() => {
                      onOpenMemoryFact(fact);
                      onOpenChange(false);
                    }}
                  >
                    <Brain className="size-4" />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate">{fact.text}</span>
                      <span className="truncate text-xs text-muted-foreground">{fact.kind}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
};
