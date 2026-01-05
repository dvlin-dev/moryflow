import { cn } from '@aiget/ui/lib'

interface PresetButtonsProps {
  onSelect: (url: string) => void
  isLoading: boolean
  disabled?: boolean
}

const presets = [
  { label: 'GitHub', url: 'https://github.com' },
  { label: 'Hacker News', url: 'https://news.ycombinator.com' },
  { label: 'Product Hunt', url: 'https://www.producthunt.com' },
  { label: 'Vercel', url: 'https://vercel.com' },
]

export function PresetButtons({
  onSelect,
  isLoading,
  disabled,
}: PresetButtonsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <span className="font-mono text-xs text-muted-foreground">Try:</span>
      {presets.map((preset) => (
        <button
          key={preset.url}
          onClick={() => onSelect(preset.url)}
          disabled={isLoading || disabled}
          className={cn(
            'border border-border px-2.5 py-1 font-mono text-xs transition-colors',
            'hover:border-foreground/50 hover:bg-muted',
            'disabled:cursor-not-allowed disabled:opacity-50'
          )}
        >
          {preset.label}
        </button>
      ))}
    </div>
  )
}
