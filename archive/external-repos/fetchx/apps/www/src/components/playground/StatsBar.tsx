interface StatsBarProps {
  captureTime: number | null
  imageSize: number | null
  dimensions: { width: number; height: number } | null
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function StatsBar({ captureTime, imageSize, dimensions }: StatsBarProps) {
  if (!captureTime && !imageSize && !dimensions) {
    return null
  }

  return (
    <div className="flex flex-wrap items-center gap-4 border border-border bg-muted/50 px-4 py-2 font-mono text-xs">
      {captureTime && (
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Time:</span>
          <span className="font-semibold">{captureTime}ms</span>
        </div>
      )}
      {imageSize && (
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Size:</span>
          <span className="font-semibold">{formatBytes(imageSize)}</span>
        </div>
      )}
      {dimensions && (
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Dimensions:</span>
          <span className="font-semibold">
            {dimensions.width}×{dimensions.height}
          </span>
        </div>
      )}
    </div>
  )
}
