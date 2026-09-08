"use client"

import dynamic from "next/dynamic"
import { APP_BRAND } from "@/lib/appBrand"

const ProjectMenu = dynamic(() => import("@/components/project/ProjectMenu"), {
  ssr: false,
  loading: () => (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-zinc-200 bg-white pt-[env(safe-area-inset-top)] shadow-sm">
      <div className="flex h-14 items-center gap-2 px-3 sm:px-4">
        <div className="h-10 w-10 rounded-lg border border-zinc-300 bg-white" />
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-sm font-bold text-white">
            F
          </span>
          <span className="truncate text-base font-bold tracking-[0.08em] text-zinc-900 sm:text-xl">
            {APP_BRAND}
          </span>
        </div>
      </div>
    </header>
  ),
})

export default function DashboardShell({ children }) {
  return (
    <div className="relative min-h-dvh overflow-x-clip">
      <ProjectMenu />
      <div className="pt-[var(--app-header-height)]">{children}</div>
    </div>
  )
}
