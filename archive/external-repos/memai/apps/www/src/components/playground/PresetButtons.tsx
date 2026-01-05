import { cn } from '@memai/ui/lib'

interface PresetButtonsProps {
  onSelect: (query: string) => void
  isLoading: boolean
  disabled?: boolean
}

const presets = [
  { label: 'User preferences', query: 'user preferences' },
  { label: 'Dark mode', query: 'dark mode settings' },
  { label: 'Meeting notes', query: 'meeting notes summary' },
  { label: 'Project ideas', query: 'project ideas brainstorm' },
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
          key={preset.query}
          onClick={() => onSelect(preset.query)}
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
