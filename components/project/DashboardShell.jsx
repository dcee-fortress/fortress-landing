"use client"

import ProjectMenu from "@/components/project/ProjectMenu"
import SyncStatusBar from "@/components/SyncStatusBar"

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
