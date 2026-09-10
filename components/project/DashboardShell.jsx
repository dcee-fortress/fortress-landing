"use client"

import ProjectMenu from "@/components/project/ProjectMenu"
import SyncStatusBar from "@/components/SyncStatusBar"
import SyncButton from "@/components/SyncButton"

export default function DashboardShell({ children }) {
  return (
    <div className="relative min-h-dvh">
      <ProjectMenu />
      <div className="pt-[var(--app-header-height)]">
        <SyncStatusBar />
        {children}
      </div>
      <SyncButton />
    </div>
  )
}

export default function DashboardShell({ children }) {
  return (
    <div className="relative min-h-dvh">
      <ProjectMenu />
      <div className="pt-[var(--app-header-height)]">
        <SyncStatusBar />
        {children}
      </div>
    </div>
  )
}
