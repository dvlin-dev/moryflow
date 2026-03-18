import { useTranslation } from '@/lib/i18n';
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

const resolveThreadSubline = (snippet: string, fallback: string) => {
  if (snippet.trim().length > 0) {
    return snippet;
  }
  return fallback;
};

export const GlobalSearchPanel = ({
  open,
  onOpenChange,
  onOpenFile,
  onOpenThread,
  onOpenMemoryFile,
  onOpenMemoryFact,
}: GlobalSearchPanelProps) => {
  const { t } = useTranslation('workspace');
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
        <DialogTitle>{t('globalSearchTitle')}</DialogTitle>
        <DialogDescription>{t('globalSearchDescription')}</DialogDescription>
      </DialogHeader>
      <DialogContent className="overflow-hidden p-0 sm:max-w-xl" showCloseButton={false}>
        <Command shouldFilter={false} loop>
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder={t('globalSearchPlaceholder')}
            autoFocus
          />
          <CommandList className="max-h-[420px]">
            {!hasEnoughQuery ? (
              <div className="px-4 py-6 text-sm text-muted-foreground">
                {t('globalSearchMinChars')}
              </div>
            ) : null}

            {loading ? (
              <div className="flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground">
                <LoaderCircle className="size-4 animate-spin" />
                {t('globalSearchSearching')}
              </div>
            ) : null}

            {error ? <div className="px-4 py-6 text-sm text-destructive">{error}</div> : null}

            {!loading && !error && hasEnoughQuery && localUnavailable ? (
              <div className="px-4 py-3 text-sm text-muted-foreground">
                {t('globalSearchLocalUnavailable')}
              </div>
            ) : null}

            {!loading && !error && hasEnoughQuery && memoryUnavailable ? (
              <div className="px-4 py-3 text-sm text-muted-foreground">{memoryUnavailable}</div>
            ) : null}

            {!loading && !error && hasEnoughQuery && !hasResults ? (
              <div className="px-4 py-6 text-sm text-muted-foreground">
                {t('globalSearchNoResults')}
              </div>
            ) : null}

            {!loading && !error && hasEnoughQuery && threads.length > 0 ? (
              <CommandGroup heading={t('globalSearchThreads')}>
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
                        {resolveThreadSubline(thread.snippet, t('globalSearchOpenThread'))}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}

            {!loading && !error && hasEnoughQuery && files.length > 0 ? (
              <CommandGroup heading={t('globalSearchFiles')}>
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
              <CommandGroup heading={t('globalSearchMemoryFiles')}>
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
                            ? t('globalSearchNotAvailableLocally')
                            : file.snippet || file.path || t('globalSearchOpenMemoryFile')}
                        </span>
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ) : null}

            {!loading && !error && hasEnoughQuery && memoryFacts.length > 0 ? (
              <CommandGroup heading={t('globalSearchFacts')}>
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
