"use client"

import ClientOnly from "@/components/ClientOnly"
import ProjectMenu from "@/components/project/ProjectMenu"

function HeaderFallback() {
  return (
    <header
      className="fixed left-0 right-0 top-0 z-50 h-14 w-full border-b border-zinc-200 bg-white pt-[env(safe-area-inset-top)] shadow-sm lg:h-16"
      suppressHydrationWarning
    />
  )
}

export default function DashboardShell({ children }) {
  return (
    <div className="relative min-h-dvh">
      <ClientOnly fallback={<HeaderFallback />}>
        <ProjectMenu />
      </ClientOnly>
      <div className="min-w-0 pt-[var(--app-header-height)]">{children}</div>
    </div>
  )
}
