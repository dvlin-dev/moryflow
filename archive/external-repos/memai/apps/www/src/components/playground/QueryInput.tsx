import { useState } from 'react'
import { Button } from '@memai/ui/primitives'
import { Search, Loader2 } from 'lucide-react'

interface QueryInputProps {
  onSubmit: (query: string) => void
  isLoading: boolean
  disabled?: boolean
}

export function QueryInput({ onSubmit, isLoading, disabled }: QueryInputProps) {
  const [query, setQuery] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = query.trim()
    if (trimmed) {
      onSubmit(trimmed)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search memories... (e.g., user preferences)"
          className="h-11 w-full border border-border bg-background pl-10 pr-4 font-mono text-sm placeholder:text-muted-foreground focus:border-foreground focus:outline-none"
          disabled={isLoading}
        />
      </div>
      <Button
        type="submit"
        disabled={isLoading || disabled || !query.trim()}
        className="h-11 font-mono"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            Search
            <Search className="ml-2 h-4 w-4" />
          </>
        )}
      </Button>
    </form>
  )
}
