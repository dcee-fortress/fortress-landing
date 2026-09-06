"use client"

import dynamic from "next/dynamic"
import { APP_BRAND } from "@/lib/appBrand"

const ProjectMenu = dynamic(() => import("@/components/project/ProjectMenu"), {
  ssr: false,
  loading: () => (
    <header className="fixed left-0 top-0 z-50 w-full border-b border-zinc-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex flex-col gap-1.5">
          <div className="h-10 w-10 rounded-lg border border-zinc-300 bg-white" />
          <div className="h-10 w-10 rounded-lg border border-zinc-300 bg-white" />
        </div>
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-900 text-sm font-bold tracking-wide text-white">
            F
          </span>
          <span className="text-lg font-bold tracking-[0.08em] text-zinc-900 sm:text-xl sm:tracking-[0.1em]">
            {APP_BRAND}
          </span>
        </div>
      </div>
    </header>
  ),
})

export default function DashboardShell({ children }) {
  return (
    <div className="relative min-h-screen">
      <ProjectMenu />
      <div className="pt-[4.25rem]">{children}</div>
    </div>
  )
}
