/**
 * [DEFINES]: Digest feedback domain types
 * [POS]: Suggestions and feedback analytics payloads
 */

export type FeedbackPatternType = 'KEYWORD' | 'DOMAIN' | 'AUTHOR';
export type FeedbackSuggestionType =
  | 'add_interest'
  | 'remove_interest'
  | 'add_negative'
  | 'adjust_score';

export interface FeedbackSuggestion {
  id: string;
  type: FeedbackSuggestionType;
  patternType: FeedbackPatternType;
  value: string;
  confidence: number;
  reason: string;
  positiveCount: number;
  negativeCount: number;
}

export interface FeedbackSuggestionsResponse {
  suggestions: FeedbackSuggestion[];
}

export interface ApplySuggestionsInput {
  suggestionIds: string[];
}

export interface ApplySuggestionsResponse {
  applied: number;
  skipped: number;
  message: string;
}

export interface FeedbackStats {
  totalPositive: number;
  totalNegative: number;
  topPositiveTerms: Array<{
    value: string;
    patternType: FeedbackPatternType;
    count: number;
  }>;
  topNegativeTerms: Array<{
    value: string;
    patternType: FeedbackPatternType;
    count: number;
  }>;
}
