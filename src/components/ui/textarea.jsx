import * as React from "react"
import { cn } from "./utils"

function Textarea({ className, ...props }) {
  return (
    <textarea
      className={cn(
        "resize-none border-input placeholder:text-muted-foreground flex min-h-16 w-full rounded-md border bg-[var(--input)] px-3 py-2 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }
