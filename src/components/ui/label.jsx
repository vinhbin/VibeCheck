import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"
import { cn } from "./utils"

function Label({ className, ...props }) {
  return (
    <LabelPrimitive.Root
      className={cn(
        "flex items-center gap-2 text-sm leading-none font-medium select-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className,
      )}
      {...props}
    />
  )
}

export { Label }
