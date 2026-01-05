interface StatsBarProps {
  searchTime: number | null
  totalFound: number | null
}

export function StatsBar({ searchTime, totalFound }: StatsBarProps) {
  if (!searchTime && totalFound === null) {
    return null
  }

  return (
    <div className="flex flex-wrap items-center gap-4 border border-border bg-muted/50 px-4 py-2 font-mono text-xs">
      {searchTime !== null && (
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Search time:</span>
          <span className="font-semibold">{searchTime}ms</span>
        </div>
      )}
      {totalFound !== null && (
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Results:</span>
          <span className="font-semibold">{totalFound} found</span>
        </div>
      )}
    </div>
  )
}
