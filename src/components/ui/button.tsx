"use client"

import React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "default"
    | "primary"
    | "secondary"
    | "outline"
    | "ghost"
    | "danger"
    | "destructive"
    | "success"
    | "link"
  size?: "default" | "sm" | "lg" | "icon"
  loading?: boolean
  square?: boolean
  asChild?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", loading, square, children, ...props }, ref) => {
    const variantClasses: Record<string, string> = {
      default: "bg-[#C46B4E] text-white hover:bg-[#B25C40] shadow-sm transition-colors",
      primary: "bg-[#C46B4E] text-white hover:bg-[#B25C40] shadow-sm transition-colors",
      secondary: "bg-white text-[#20252B] border border-[#20252B] hover:bg-[#20252B]/5 transition-colors",
      outline: "border border-[#E5E1D9] bg-transparent text-[#20252B] hover:bg-[#E9E3D8]/50 hover:text-[#20252B] transition-colors",
      ghost: "hover:bg-[#E9E3D8]/50 text-[#20252B] transition-colors",
      danger: "bg-red-700 text-white hover:bg-red-800 shadow-sm transition-colors",
      destructive: "bg-red-700 text-white hover:bg-red-800 shadow-sm transition-colors",
      success: "bg-emerald-700 text-white hover:bg-emerald-800 shadow-sm transition-colors",
      link: "text-[#C46B4E] underline-offset-4 hover:underline",
    }

    const sizeClasses = {
      default: "h-10 rounded-xl px-4 py-2 text-sm font-medium",
      sm: "h-8 rounded-lg px-3 text-xs font-medium",
      lg: "h-11 rounded-xl px-8 text-base font-medium",
      icon: "h-10 w-10 rounded-xl flex items-center justify-center",
    }

    return (
      <button
        ref={ref}
        className={cn(
          "transition-all duration-150 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C46B4E] focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none inline-flex items-center justify-center cursor-pointer font-medium",
          square && "rounded-none",
          variantClasses[variant] || variantClasses.default,
          sizeClasses[size] || sizeClasses.default,
          loading && "animate-pulse cursor-wait",
          className
        )}
        {...props}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <svg
              className="h-4 w-4 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" strokeWidth="2" strokeDasharray="32" opacity="0.4" />
              <path d="M12 2a10 10 0 0 1 10 10" />
            </svg>
            {children}
          </span>
        ) : (
          children
        )}
      </button>
    )
  }
)
Button.displayName = "Button"
