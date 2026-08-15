import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Pills, no shadow — elevation is lightness only. docs/DESIGN.md §4, §6.
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-butter focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:pointer-events-none disabled:border-transparent disabled:bg-card-2 disabled:text-grey [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // The one primary action in a view. Black on butter is 18.4:1.
        default: "bg-butter font-semibold text-black hover:bg-butter-deep",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-hair-strong text-ash hover:border-grey hover:bg-card",
        secondary: "bg-card text-ash hover:bg-card-2",
        ghost: "text-grey hover:bg-card hover:text-ash",
        link: "text-butter underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-7 text-md",
        sm: "h-9 px-5 text-base",
        lg: "h-12 px-8 text-md",
        icon: "h-11 w-11",
        "icon-sm": "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
