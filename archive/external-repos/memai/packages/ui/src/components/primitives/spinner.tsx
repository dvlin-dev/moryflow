import { cn } from "../../lib/utils"
import { HugeiconsIcon } from "@hugeicons/react"
import { Loading03Icon } from "@hugeicons/core-free-icons"

interface SpinnerProps {
  className?: string
}

function Spinner({ className }: SpinnerProps) {
  return (
    <HugeiconsIcon icon={Loading03Icon} strokeWidth={2} role="status" aria-label="Loading" className={cn("size-4 animate-spin", className)} />
  )
}

export { Spinner }
