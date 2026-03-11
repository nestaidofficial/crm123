import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap text-body-m font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/20 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "h-11 px-4 py-3 rounded-md bg-primary-500 text-white hover:bg-primary-600 font-semibold",
        destructive:
          "h-11 px-4 py-3 rounded-md bg-black text-white hover:bg-neutral-800",
        outline:
          "h-11 px-4 py-3 rounded-md border border-neutral-200 bg-neutral-0 text-neutral-900 hover:bg-neutral-50",
        secondary:
          "h-11 px-4 py-3 rounded-md border border-neutral-200 bg-neutral-0 text-neutral-900 hover:bg-neutral-50",
        ghost: "h-11 px-4 py-3 rounded-md hover:bg-neutral-50 text-neutral-900",
        link: "text-primary-500 underline-offset-4 hover:underline h-auto p-0",
      },
      size: {
        default: "h-11 px-4 py-3 rounded-md",
        sm: "h-9 rounded-sm px-3 text-body-s",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10 rounded-md min-w-[40px] min-h-[40px]",
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
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
