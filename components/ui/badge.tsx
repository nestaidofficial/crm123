import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center h-8 rounded-full border px-2.5 py-1.5 text-body-s font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary-500 text-white",
        secondary:
          "border-neutral-200 bg-neutral-0 text-neutral-900",
        destructive:
          "border-transparent bg-error-500 text-white",
        outline: "border-neutral-200 bg-neutral-0 text-neutral-900",
        selected:
          "border-neutral-200 bg-primary-100 text-primary-500",
        // Semantic color variants
        warning:
          "bg-[#fdf8c9] border-[#fbd992] text-[#b13600]",
        info:
          "bg-[#e2fbfe] border-[#a8e7fc] text-[#045ad0]",
        neutral:
          "bg-[#f5f6f8] border-[#d8dee4] text-[#596171]",
        positive:
          "bg-[#eafcdd] border-[#a8f171] text-[#217007]",
        negative:
          "bg-[#fef4f6] border-[#fcd2dc] text-[#c0123d]",
      },
    },
    defaultVariants: {
      variant: "secondary",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof badgeVariants> {
  asChild?: boolean
}

function Badge({ className, variant, asChild = false, ...props }: BadgeProps) {
  const Comp = asChild ? Slot : "div"
  return (
    <Comp className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
