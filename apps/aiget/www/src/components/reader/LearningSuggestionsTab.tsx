/**
 * [PROPS]: subscriptionId
 * [POS]: Learning suggestions tab showing feedback patterns and recommendations
 */

import { useState } from 'react';
import { ScrollArea, Button, Card, CardContent, Skeleton, Icon, Checkbox, Badge } from '@aiget/ui';
import {
  ArrowUp02Icon,
  ArrowDown02Icon,
  Add01Icon,
  Remove01Icon,
  Link01Icon,
  UserIcon,
  Tag01Icon,
} from '@hugeicons/core-free-icons';
import {
  useFeedbackSuggestions,
  useApplyFeedbackSuggestions,
  useFeedbackStats,
} from '@/features/digest/hooks';
import type { FeedbackSuggestion, FeedbackPatternType } from '@/features/digest/types';

interface LearningSuggestionsTabProps {
  subscriptionId: string;
}

function getPatternIcon(patternType: FeedbackPatternType) {
  switch (patternType) {
    case 'KEYWORD':
      return Tag01Icon;
    case 'DOMAIN':
      return Link01Icon;
    case 'AUTHOR':
      return UserIcon;
    default:
      return Tag01Icon;
  }
}

function getSuggestionTypeInfo(type: FeedbackSuggestion['type']) {
  switch (type) {
    case 'add_interest':
      return { icon: Add01Icon, label: 'Add to interests', color: 'text-green-600 bg-green-100' };
    case 'remove_interest':
      return {
        icon: Remove01Icon,
        label: 'Remove from interests',
        color: 'text-orange-600 bg-orange-100',
      };
    case 'add_negative':
      return {
        icon: ArrowDown02Icon,
        label: 'Add to blocklist',
        color: 'text-red-600 bg-red-100',
      };
    case 'adjust_score':
      return { icon: ArrowUp02Icon, label: 'Adjust scoring', color: 'text-blue-600 bg-blue-100' };
    default:
      return { icon: Tag01Icon, label: 'Suggestion', color: 'text-gray-600 bg-gray-100' };
  }
}

export function LearningSuggestionsTab({ subscriptionId }: LearningSuggestionsTabProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const {
    data: suggestionsData,
    isLoading: suggestionsLoading,
    error: suggestionsError,
  } = useFeedbackSuggestions(subscriptionId);

  const {
    data: statsData,
    isLoading: statsLoading,
    error: statsError,
  } = useFeedbackStats(subscriptionId);

  const applyMutation = useApplyFeedbackSuggestions();

  const suggestions = suggestionsData?.suggestions ?? [];

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleApplySelected = () => {
    if (selectedIds.size === 0) return;
    applyMutation.mutate(
      {
        subscriptionId,
        data: { suggestionIds: Array.from(selectedIds) },
      },
      {
        onSuccess: () => {
          setSelectedIds(new Set());
        },
      }
    );
  };

  const handleApplySingle = (id: string) => {
    applyMutation.mutate({
      subscriptionId,
      data: { suggestionIds: [id] },
    });
  };

  if (suggestionsLoading || statsLoading) {
    return (
      <div className="space-y-3 p-6">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="mb-2 h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const hasError = suggestionsError || statsError;

  return (
    <ScrollArea className="h-[400px]">
      <div className="space-y-4 p-6">
        <div>
          <h3 className="mb-1 text-sm font-medium">Learning Suggestions</h3>
          <p className="text-xs text-muted-foreground">
            Based on your feedback, the system has identified these patterns:
          </p>
        </div>

        {hasError && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3">
            <p className="text-sm text-destructive">Failed to load suggestions</p>
          </div>
        )}

        {!hasError && suggestions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8">
            <p className="text-sm text-muted-foreground">No suggestions yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Use save and not interested to train the system
            </p>
          </div>
        ) : (
          <>
            {selectedIds.size > 0 && (
              <div className="flex items-center justify-between rounded-md bg-muted/50 p-2">
                <span className="text-sm text-muted-foreground">{selectedIds.size} selected</span>
                <Button size="sm" onClick={handleApplySelected} disabled={applyMutation.isPending}>
                  {applyMutation.isPending ? 'Applying...' : 'Apply Selected'}
                </Button>
              </div>
            )}

            <div className="space-y-3">
              {suggestions.map((suggestion) => {
                const typeInfo = getSuggestionTypeInfo(suggestion.type);
                const PatternIcon = getPatternIcon(suggestion.patternType);
                const isSelected = selectedIds.has(suggestion.id);

                return (
                  <Card key={suggestion.id} className={isSelected ? 'ring-2 ring-primary' : ''}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelection(suggestion.id)}
                          className="mt-1"
                        />
                        <div className={`rounded-full p-1.5 ${typeInfo.color}`}>
                          <Icon icon={typeInfo.icon} className="size-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="secondary" className="gap-1">
                              <Icon icon={PatternIcon} className="size-3" />
                              {suggestion.patternType.toLowerCase()}
                            </Badge>
                            <span className="font-medium text-sm">{suggestion.value}</span>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">{suggestion.reason}</p>
                          <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="text-green-600">
                              +{suggestion.positiveCount} saved
                            </span>
                            <span className="text-red-600">
                              -{suggestion.negativeCount} not interested
                            </span>
                            <span>{Math.round(suggestion.confidence * 100)}% confidence</span>
                          </div>
                          <div className="mt-3 flex gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleApplySingle(suggestion.id)}
                              disabled={applyMutation.isPending}
                            >
                              {typeInfo.label}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}

        {/* Feedback Statistics */}
        <div className="rounded-md border p-4">
          <h4 className="mb-3 text-sm font-medium">Feedback Statistics</h4>
          {statsData ? (
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1 rounded-md bg-green-50 p-3 dark:bg-green-950">
                  <p className="text-2xl font-semibold text-green-600">{statsData.totalPositive}</p>
                  <p className="text-xs text-green-600/70">Total Saved</p>
                </div>
                <div className="flex-1 rounded-md bg-red-50 p-3 dark:bg-red-950">
                  <p className="text-2xl font-semibold text-red-600">{statsData.totalNegative}</p>
                  <p className="text-xs text-red-600/70">Not Interested</p>
                </div>
              </div>

              {statsData.topPositiveTerms.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                    Top Saved Patterns
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {statsData.topPositiveTerms.slice(0, 5).map((term, idx) => (
                      <Badge key={idx} variant="secondary" className="text-green-600">
                        {term.value} ({term.count})
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {statsData.topNegativeTerms.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                    Top Not Interested Patterns
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {statsData.topNegativeTerms.slice(0, 5).map((term, idx) => (
                      <Badge key={idx} variant="secondary" className="text-red-600">
                        {term.value} ({term.count})
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Feedback statistics will appear here once you start using save and not interested
              actions.
            </p>
          )}
        </div>
      </div>
    </ScrollArea>
  );
}
