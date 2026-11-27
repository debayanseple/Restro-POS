"use client"

import React from "react"
import { cn } from "@/lib/utils"

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  isDarkMode?: boolean
}

export function Skeleton({ className, isDarkMode, ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative overflow-hidden rounded-xl",
        isDarkMode === true
          ? "bg-[#1c202c]"
          : isDarkMode === false
          ? "bg-[#E7E2D8]"
          : "skeleton-shimmer",
        isDarkMode !== undefined && "skeleton-shimmer",
        className
      )}
      style={
        isDarkMode === true
          ? { backgroundColor: "#1c202c" }
          : isDarkMode === false
          ? { backgroundColor: "#E7E2D8" }
          : undefined
      }
      {...props}
    />
  )
}

export function SectionContentSkeleton({
  tab = "dashboard",
  isDarkMode = true,
}: {
  tab?: string
  isDarkMode?: boolean
}) {
  const cardCls = isDarkMode
    ? "bg-[#14161f] border-[#202330]"
    : "bg-white border-[#E5E1D9] shadow-2xs"
  const subCls = isDarkMode
    ? "bg-[#191c27] border-[#252938]"
    : "bg-[#F7F5F0] border-[#E5E1D9]"

  // Dashboard / Reports / Accounting (KPI Strip + Charts + Grid)
  if (tab === "dashboard" || tab === "reports" || tab === "accounting" || tab === "analytics") {
    return (
      <div className="space-y-6 max-w-[1440px] mx-auto animate-in fade-in duration-150">
        {/* Header Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Skeleton isDarkMode={isDarkMode} className="h-8 w-64" />
              <Skeleton isDarkMode={isDarkMode} className="h-6 w-20 rounded-full" />
            </div>
            <Skeleton isDarkMode={isDarkMode} className="h-4 w-96 max-w-full" />
          </div>
          <div className="flex items-center gap-2.5">
            <Skeleton isDarkMode={isDarkMode} className="h-9 w-56" />
            <Skeleton isDarkMode={isDarkMode} className="h-9 w-36" />
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className={`p-4 rounded-2xl border space-y-3 ${cardCls}`}>
              <div className="flex items-center justify-between">
                <Skeleton isDarkMode={isDarkMode} className="h-3 w-16" />
                <Skeleton isDarkMode={isDarkMode} className="h-7 w-7 rounded-lg" />
              </div>
              <Skeleton isDarkMode={isDarkMode} className="h-6 w-24" />
              <Skeleton isDarkMode={isDarkMode} className="h-3 w-28" />
            </div>
          ))}
        </div>

        {/* Main Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className={`lg:col-span-8 p-5 rounded-2xl border space-y-4 ${cardCls}`}>
            <div className="flex items-center justify-between">
              <div className="space-y-1.5">
                <Skeleton isDarkMode={isDarkMode} className="h-4 w-48" />
                <Skeleton isDarkMode={isDarkMode} className="h-3 w-64" />
              </div>
              <Skeleton isDarkMode={isDarkMode} className="h-6 w-32" />
            </div>
            <Skeleton isDarkMode={isDarkMode} className="h-52 w-full rounded-2xl" />
          </div>

          <div className={`lg:col-span-4 p-5 rounded-2xl border space-y-4 ${cardCls}`}>
            <div className="flex items-center justify-between">
              <Skeleton isDarkMode={isDarkMode} className="h-4 w-40" />
              <Skeleton isDarkMode={isDarkMode} className="h-7 w-28" />
            </div>
            <div className="flex items-center gap-5 py-2">
              <Skeleton isDarkMode={isDarkMode} className="h-36 w-36 rounded-full shrink-0" />
              <div className="flex-1 space-y-2.5">
                <Skeleton isDarkMode={isDarkMode} className="h-6 w-full" />
                <Skeleton isDarkMode={isDarkMode} className="h-6 w-full" />
                <Skeleton isDarkMode={isDarkMode} className="h-6 w-full" />
              </div>
            </div>
            <Skeleton isDarkMode={isDarkMode} className="h-4 w-full" />
          </div>
        </div>

        {/* Bottom 3-Column Analytics Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className={`p-5 rounded-2xl border space-y-3.5 ${cardCls}`}>
              <Skeleton isDarkMode={isDarkMode} className="h-4 w-44" />
              <Skeleton isDarkMode={isDarkMode} className="h-3 w-56" />
              <div className="space-y-2.5 pt-1">
                <Skeleton isDarkMode={isDarkMode} className="h-10 w-full" />
                <Skeleton isDarkMode={isDarkMode} className="h-10 w-full" />
                <Skeleton isDarkMode={isDarkMode} className="h-10 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Point of Sale (POS) Split Layout
  if (tab === "pos") {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-[1440px] mx-auto animate-in fade-in duration-150">
        <div className="lg:col-span-8 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Skeleton isDarkMode={isDarkMode} className="h-8 w-52" />
            <div className="flex gap-2">
              <Skeleton isDarkMode={isDarkMode} className="h-9 w-24" />
              <Skeleton isDarkMode={isDarkMode} className="h-9 w-24" />
              <Skeleton isDarkMode={isDarkMode} className="h-9 w-24" />
            </div>
          </div>
          <div className="flex gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} isDarkMode={isDarkMode} className="h-8 w-20 rounded-xl" />
            ))}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
            {Array.from({ length: 9 }).map((_, idx) => (
              <div key={idx} className={`p-4 rounded-2xl border space-y-3 ${cardCls}`}>
                <div className="flex items-center justify-between">
                  <Skeleton isDarkMode={isDarkMode} className="h-9 w-9 rounded-xl" />
                  <Skeleton isDarkMode={isDarkMode} className="h-4 w-12 rounded-full" />
                </div>
                <Skeleton isDarkMode={isDarkMode} className="h-4 w-3/4" />
                <div className="flex items-center justify-between pt-1">
                  <Skeleton isDarkMode={isDarkMode} className="h-5 w-14" />
                  <Skeleton isDarkMode={isDarkMode} className="h-7 w-16 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={`lg:col-span-4 p-5 rounded-2xl border space-y-4 h-fit ${cardCls}`}>
          <Skeleton isDarkMode={isDarkMode} className="h-6 w-40" />
          <Skeleton isDarkMode={isDarkMode} className="h-10 w-full" />
          <div className="space-y-2.5 pt-2">
            <Skeleton isDarkMode={isDarkMode} className="h-14 w-full" />
            <Skeleton isDarkMode={isDarkMode} className="h-14 w-full" />
            <Skeleton isDarkMode={isDarkMode} className="h-14 w-full" />
          </div>
          <div className="pt-3 border-t border-inherit space-y-2">
            <Skeleton isDarkMode={isDarkMode} className="h-4 w-full" />
            <Skeleton isDarkMode={isDarkMode} className="h-6 w-full" />
            <Skeleton isDarkMode={isDarkMode} className="h-11 w-full rounded-xl mt-2" />
          </div>
        </div>
      </div>
    )
  }

  // Tables Floor Plan
  if (tab === "tables") {
    return (
      <div className="space-y-6 max-w-[1440px] mx-auto animate-in fade-in duration-150">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton isDarkMode={isDarkMode} className="h-8 w-44" />
            <Skeleton isDarkMode={isDarkMode} className="h-4 w-72" />
          </div>
          <div className="flex gap-2">
            <Skeleton isDarkMode={isDarkMode} className="h-9 w-36" />
            <Skeleton isDarkMode={isDarkMode} className="h-9 w-32" />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`p-4 rounded-2xl border space-y-2 ${cardCls}`}>
              <Skeleton isDarkMode={isDarkMode} className="h-3 w-20" />
              <Skeleton isDarkMode={isDarkMode} className="h-7 w-14" />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, idx) => (
            <div key={idx} className={`p-5 rounded-2xl border space-y-4 ${cardCls}`}>
              <div className="flex items-center justify-between">
                <Skeleton isDarkMode={isDarkMode} className="h-5 w-24" />
                <Skeleton isDarkMode={isDarkMode} className="h-5 w-20 rounded-full" />
              </div>
              <div className="flex items-center justify-center py-3">
                <Skeleton isDarkMode={isDarkMode} className="h-20 w-20 rounded-2xl" />
              </div>
              <div className="flex gap-2">
                <Skeleton isDarkMode={isDarkMode} className="h-8 flex-1" />
                <Skeleton isDarkMode={isDarkMode} className="h-8 w-9" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // KDS 3-Column Kanban
  if (tab === "kds") {
    return (
      <div className="space-y-6 max-w-[1440px] mx-auto animate-in fade-in duration-150">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton isDarkMode={isDarkMode} className="h-8 w-52" />
            <Skeleton isDarkMode={isDarkMode} className="h-4 w-72" />
          </div>
          <Skeleton isDarkMode={isDarkMode} className="h-10 w-64" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {Array.from({ length: 3 }).map((_, colIdx) => (
            <div key={colIdx} className={`p-4 rounded-2xl border space-y-3 ${cardCls}`}>
              <div className="flex items-center justify-between pb-2">
                <Skeleton isDarkMode={isDarkMode} className="h-5 w-32" />
                <Skeleton isDarkMode={isDarkMode} className="h-5 w-8 rounded-full" />
              </div>
              {Array.from({ length: 2 }).map((_, cardIdx) => (
                <div key={cardIdx} className={`p-4 rounded-xl border space-y-3 ${subCls}`}>
                  <div className="flex justify-between">
                    <Skeleton isDarkMode={isDarkMode} className="h-4 w-24" />
                    <Skeleton isDarkMode={isDarkMode} className="h-4 w-12" />
                  </div>
                  <Skeleton isDarkMode={isDarkMode} className="h-3.5 w-full" />
                  <Skeleton isDarkMode={isDarkMode} className="h-3.5 w-3/4" />
                  <Skeleton isDarkMode={isDarkMode} className="h-8 w-full rounded-lg" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // My Deliveries 2-Col Dispatch Cards
  if (tab === "my-deliveries" || tab === "delivery") {
    return (
      <div className="space-y-6 max-w-[1440px] mx-auto animate-in fade-in duration-150">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton isDarkMode={isDarkMode} className="h-8 w-72" />
            <Skeleton isDarkMode={isDarkMode} className="h-4 w-96 max-w-full" />
          </div>
          <div className="flex gap-2">
            <Skeleton isDarkMode={isDarkMode} className="h-9 w-32" />
            <Skeleton isDarkMode={isDarkMode} className="h-9 w-36" />
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`p-4 rounded-2xl border space-y-2 ${cardCls}`}>
              <Skeleton isDarkMode={isDarkMode} className="h-3 w-24" />
              <Skeleton isDarkMode={isDarkMode} className="h-6 w-20" />
              <Skeleton isDarkMode={isDarkMode} className="h-3 w-28" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`p-5 rounded-2xl border space-y-4 ${cardCls}`}>
              <div className="flex justify-between">
                <Skeleton isDarkMode={isDarkMode} className="h-6 w-44" />
                <Skeleton isDarkMode={isDarkMode} className="h-6 w-16 rounded-full" />
              </div>
              <Skeleton isDarkMode={isDarkMode} className="h-24 w-full" />
              <Skeleton isDarkMode={isDarkMode} className="h-12 w-full" />
              <div className="flex justify-end gap-2">
                <Skeleton isDarkMode={isDarkMode} className="h-8 w-28" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Settings Sidebar + Form Panel
  if (tab === "settings" || tab === "platform-settings") {
    return (
      <div className="space-y-6 max-w-[1440px] mx-auto animate-in fade-in duration-150">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton isDarkMode={isDarkMode} className="h-8 w-52" />
            <Skeleton isDarkMode={isDarkMode} className="h-4 w-80 max-w-full" />
          </div>
          <div className="flex gap-2">
            <Skeleton isDarkMode={isDarkMode} className="h-9 w-28" />
            <Skeleton isDarkMode={isDarkMode} className="h-9 w-36" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className={`lg:col-span-3 p-3 rounded-2xl border space-y-2 ${cardCls}`}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} isDarkMode={isDarkMode} className="h-10 w-full" />
            ))}
          </div>
          <div className={`lg:col-span-9 p-6 rounded-2xl border space-y-5 ${cardCls}`}>
            <Skeleton isDarkMode={isDarkMode} className="h-6 w-60" />
            <Skeleton isDarkMode={isDarkMode} className="h-16 w-full" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <Skeleton isDarkMode={isDarkMode} className="h-3 w-28" />
                  <Skeleton isDarkMode={isDarkMode} className="h-10 w-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Default Table / List Views (Orders, Inventory, Customers, Reservations, Menu, Team, Tenants)
  return (
    <div className="space-y-6 max-w-[1440px] mx-auto animate-in fade-in duration-150">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton isDarkMode={isDarkMode} className="h-8 w-56" />
          <Skeleton isDarkMode={isDarkMode} className="h-4 w-80 max-w-full" />
        </div>
        <div className="flex gap-2">
          <Skeleton isDarkMode={isDarkMode} className="h-9 w-32" />
          <Skeleton isDarkMode={isDarkMode} className="h-9 w-36" />
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={`p-4 rounded-2xl border space-y-2.5 ${cardCls}`}>
            <Skeleton isDarkMode={isDarkMode} className="h-3 w-24" />
            <Skeleton isDarkMode={isDarkMode} className="h-6 w-28" />
            <Skeleton isDarkMode={isDarkMode} className="h-3 w-36" />
          </div>
        ))}
      </div>

      {/* Filter Bar + Table Skeleton */}
      <div className={`rounded-2xl border overflow-hidden ${cardCls}`}>
        <div className="p-4 border-b border-inherit flex flex-wrap items-center justify-between gap-3">
          <Skeleton isDarkMode={isDarkMode} className="h-9 w-72 max-w-full" />
          <div className="flex gap-2">
            <Skeleton isDarkMode={isDarkMode} className="h-8 w-20" />
            <Skeleton isDarkMode={isDarkMode} className="h-8 w-20" />
            <Skeleton isDarkMode={isDarkMode} className="h-8 w-24" />
          </div>
        </div>

        <div className="p-4 space-y-3">
          {Array.from({ length: 7 }).map((_, rowIdx) => (
            <div key={rowIdx} className="flex items-center justify-between gap-4 py-1.5">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Skeleton isDarkMode={isDarkMode} className="h-8 w-8 rounded-lg shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton isDarkMode={isDarkMode} className="h-3.5 w-48 max-w-full" />
                  <Skeleton isDarkMode={isDarkMode} className="h-2.5 w-32" />
                </div>
              </div>
              <Skeleton isDarkMode={isDarkMode} className="h-5 w-20 rounded-full hidden sm:block" />
              <Skeleton isDarkMode={isDarkMode} className="h-4 w-24 hidden md:block" />
              <Skeleton isDarkMode={isDarkMode} className="h-7 w-20 rounded-lg shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function PortalShellSkeleton({
  variant = "dashboard",
  isDarkMode = true,
}: {
  variant?: string
  isDarkMode?: boolean
}) {
  return (
    <div
      className={`h-screen overflow-hidden flex flex-col font-sans select-none antialiased ${
        isDarkMode ? "bg-[#20252B] text-[#F7F5F0]" : "bg-[#F7F5F0] text-[#20252B]"
      }`}
    >
      {/* Top Status Strip Skeleton */}
      <div
        className={`h-8 px-4 flex items-center justify-between border-b shrink-0 ${
          isDarkMode ? "bg-[#141620] border-[#202330]" : "bg-slate-100 border-slate-200"
        }`}
      >
        <div className="flex items-center gap-2.5">
          <Skeleton isDarkMode={isDarkMode} className="h-2.5 w-2.5 rounded-full" />
          <Skeleton isDarkMode={isDarkMode} className="h-3 w-44" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton isDarkMode={isDarkMode} className="h-4 w-32 rounded-md" />
          <Skeleton isDarkMode={isDarkMode} className="h-4 w-16 rounded-md" />
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar Skeleton */}
        <aside
          className={`hidden md:flex w-[240px] border-r flex-col shrink-0 ${
            isDarkMode ? "bg-[#111217] border-[#1e2029]" : "bg-white border-slate-200"
          }`}
        >
          <div className="p-4 flex items-center gap-3 border-b border-inherit">
            <Skeleton isDarkMode={isDarkMode} className="w-8 h-8 rounded-full shrink-0" />
            <Skeleton isDarkMode={isDarkMode} className="h-4 w-28" />
          </div>
          <div className="px-3 pt-3 pb-2">
            <Skeleton isDarkMode={isDarkMode} className="h-9 w-full rounded-xl" />
          </div>
          <div className="flex-1 px-3 py-2 space-y-1.5 overflow-hidden">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2">
                <Skeleton isDarkMode={isDarkMode} className="w-4 h-4 rounded-md shrink-0" />
                <Skeleton isDarkMode={isDarkMode} className="h-3.5 flex-1" />
              </div>
            ))}
          </div>
          <div className="p-3 border-t border-inherit space-y-2">
            <Skeleton isDarkMode={isDarkMode} className="h-8 w-full rounded-xl" />
            <Skeleton isDarkMode={isDarkMode} className="h-8 w-full rounded-xl" />
          </div>
        </aside>

        {/* Main Workspace Skeleton */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <header
            className={`h-14 border-b px-6 flex items-center justify-between shrink-0 ${
              isDarkMode ? "bg-[#20252B] border-[#1c1e27]" : "bg-white border-slate-200"
            }`}
          >
            <div className="flex items-center gap-3">
              <Skeleton isDarkMode={isDarkMode} className="w-8 h-8 rounded-lg" />
              <Skeleton isDarkMode={isDarkMode} className="h-4 w-32 hidden md:block" />
            </div>
            <Skeleton isDarkMode={isDarkMode} className="h-7 w-44 rounded-xl" />
            <div className="flex items-center gap-3">
              <Skeleton isDarkMode={isDarkMode} className="w-8 h-8 rounded-lg" />
              <Skeleton isDarkMode={isDarkMode} className="w-8 h-8 rounded-lg" />
              <Skeleton isDarkMode={isDarkMode} className="w-28 h-8 rounded-full" />
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-6 lg:p-8">
            <SectionContentSkeleton tab={variant} isDarkMode={isDarkMode} />
          </main>
        </div>
      </div>
    </div>
  )
}
