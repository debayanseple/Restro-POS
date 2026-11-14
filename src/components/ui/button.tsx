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
      default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
      primary: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
      secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
      outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
      ghost: "hover:bg-accent hover:text-accent-foreground",
      danger: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm",
      destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm",
      success: "bg-emerald-600 text-white hover:bg-emerald-500 shadow-sm",
      link: "text-primary underline-offset-4 hover:underline",
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
          "transition-all duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none inline-flex items-center justify-center cursor-pointer",
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
