import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-sm border px-1.5 py-0.5 text-[10px] font-semibold transition-colors focus:outline-none focus:ring-1 focus:ring-ring focus:ring-offset-1 uppercase tracking-wider",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary/10 text-primary",
        secondary:
          "border-transparent bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400",
        destructive:
          "border-transparent bg-red-500/10 text-red-500",
        outline: "text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10",
        success: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
