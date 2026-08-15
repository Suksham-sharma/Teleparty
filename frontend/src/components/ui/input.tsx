import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Pill, card fill, butter border on focus. docs/DESIGN.md §6.
          "flex h-11 w-full rounded-full border border-hair bg-card px-5 text-md text-white transition-colors file:border-0 file:bg-transparent file:text-base file:font-medium file:text-ash placeholder:text-grey-dim focus-visible:border-butter focus-visible:bg-card-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
