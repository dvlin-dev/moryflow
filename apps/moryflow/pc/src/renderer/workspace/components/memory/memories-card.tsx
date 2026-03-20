import { useState, type KeyboardEvent } from 'react';
import { Brain, ChevronRight, MessageSquare, Pencil } from 'lucide-react';
import { Input } from '@moryflow/ui/components/input';
import { useTranslation } from '@/lib/i18n';
import type { MemoryFact } from '@shared/ipc';
import { relativeTime } from './helpers';

interface MemoriesCardProps {
  facts: MemoryFact[];
  totalCount: number;
  loading: boolean;
  onCreateFact: (text: string) => void;
  onOpenDetail: () => void;
  onSelectFact: (id: string) => void;
}

export function MemoriesCard({
  facts,
  totalCount,
  loading,
  onCreateFact,
  onOpenDetail,
  onSelectFact,
}: MemoriesCardProps) {
  const { t } = useTranslation('workspace');
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim().length > 0) {
      e.preventDefault();
      onCreateFact(inputValue.trim());
      setInputValue('');
    }
  };

  const preview = facts.slice(0, 5);

  return (
    <div className="rounded-xl border border-border/60 shadow-xs p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-foreground">{t('memoriesTitle')}</h2>
          <span className="text-xs text-muted-foreground">
            {t('memoriesAboutYou')} &middot;{' '}
            {t(totalCount === 1 ? 'memoriesCountOne' : 'memoriesCountOther', { count: totalCount })}
          </span>
        </div>
        <button
          type="button"
          onClick={onOpenDetail}
          className="flex items-center justify-center rounded-lg p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      {/* Input */}
      <Input
        value={inputValue}
        onChange={(e) => setInputValue(e.currentTarget.value)}
        onKeyDown={handleKeyDown}
        placeholder={t('memoriesInputPlaceholder')}
        className="mb-3 h-9 rounded-lg text-sm"
      />

      {/* List or empty state */}
      {!loading && preview.length === 0 ? (
        <div className="flex flex-col items-center gap-1.5 py-6 text-center">
          <Brain className="size-8 text-muted-foreground/50" />
          <p className="text-xs font-medium text-muted-foreground">{t('memoriesNoMemoriesYet')}</p>
          <p className="text-xs text-muted-foreground">{t('memoriesStartChatting')}</p>
        </div>
      ) : (
        <div className="flex flex-col">
          {preview.map((fact) => (
            <button
              key={fact.id}
              type="button"
              onClick={() => onSelectFact(fact.id)}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-accent"
            >
              <span className="min-w-0 flex-1 truncate text-sm text-foreground">{fact.text}</span>
              <span className="flex shrink-0 items-center gap-1.5 text-muted-foreground">
                {fact.metadata?.origin === 'agent_tool' ? (
                  <MessageSquare className="size-3.5" />
                ) : (
                  <Pencil className="size-3.5" />
                )}
                <span className="text-xs">{relativeTime(fact.updatedAt)}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
