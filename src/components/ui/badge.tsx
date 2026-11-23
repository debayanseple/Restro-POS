"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | "default"
    | "secondary"
    | "destructive"
    | "outline"
    | "success"
    | "warning"
    | "info"
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "default", children, ...props }, ref) => {
    const variantStyles = {
      default: "bg-[#C46B4E] text-white",
      secondary: "bg-[#E9E3D8] text-[#20252B] border border-[#E5E1D9]",
      destructive: "bg-red-700 text-white",
      outline: "border border-[#E5E1D9] text-[#20252B] bg-white",
      success: "bg-emerald-50 text-emerald-800 border border-emerald-200",
      warning: "bg-amber-50 text-amber-800 border border-amber-200",
      info: "bg-[#F7F5F0] text-[#20252B] border border-[#E5E1D9]",
    }

    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
          variantStyles[variant] || variantStyles.default,
          className
        )}
        {...props}
      >
        {children}
      </span>
    )
  }
)

Badge.displayName = "Badge"
