import { Loader2, AlertCircle, Search } from 'lucide-react'
import type { SearchResult } from '@/lib/api'

interface SearchResultsProps {
  isLoading: boolean
  error: string | null
  results: SearchResult[] | null
}

function formatScore(score: number): string {
  return `${(score * 100).toFixed(1)}%`
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function SearchResults({
  isLoading,
  error,
  results,
}: SearchResultsProps) {
  if (isLoading) {
    return (
      <div className="flex h-[300px] items-center justify-center border border-border bg-muted/30">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="font-mono text-sm text-muted-foreground">
            Searching memories...
          </span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-[300px] items-center justify-center border border-destructive/50 bg-destructive/5">
        <div className="flex flex-col items-center gap-3 px-4 text-center">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <span className="font-mono text-sm text-destructive">{error}</span>
        </div>
      </div>
    )
  }

  if (results && results.length > 0) {
    return (
      <div className="space-y-3">
        {results.map((result) => (
          <div
            key={result.id}
            className="border border-border bg-card p-4 transition-colors hover:border-foreground/20"
          >
            <div className="flex items-start justify-between gap-4">
              <p className="flex-1 font-mono text-sm">{result.content}</p>
              <span className="shrink-0 border border-border bg-muted px-2 py-0.5 font-mono text-xs font-semibold text-foreground">
                {formatScore(result.score)}
              </span>
            </div>
            <div className="mt-3 flex items-center gap-4">
              <span className="font-mono text-xs text-muted-foreground">
                {formatDate(result.createdAt)}
              </span>
              {result.tags && result.tags.length > 0 && (
                <div className="flex gap-1">
                  {result.tags.map((tag) => (
                    <span
                      key={tag}
                      className="border border-border px-1.5 py-0.5 font-mono text-xs text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (results && results.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center border border-border bg-muted/30">
        <div className="flex flex-col items-center gap-2 px-4 text-center">
          <Search className="h-8 w-8 text-muted-foreground" />
          <span className="font-mono text-sm text-muted-foreground">
            No matching memories found
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-[300px] items-center justify-center border border-dashed border-border bg-muted/30">
      <div className="flex flex-col items-center gap-2 px-4 text-center">
        <Search className="h-8 w-8 text-muted-foreground/50" />
        <span className="font-mono text-sm text-muted-foreground">
          Enter a query above to search memories
        </span>
        <span className="font-mono text-xs text-muted-foreground/70">
          No API key required for demo
        </span>
      </div>
    </div>
  )
}
