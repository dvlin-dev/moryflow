import * as React from "react"

import { cn } from "../lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-border-muted placeholder:text-muted-foreground focus:border-input-focus focus:ring-2 focus:ring-ring/20 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/20 dark:border-border flex field-sizing-content min-h-16 w-full rounded-lg border bg-background px-3 py-2 text-base transition-all duration-fast outline-hidden hover:border-border disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
