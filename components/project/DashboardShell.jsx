"use client"

import ProjectMenu from "@/components/project/ProjectMenu"

export default function DashboardShell({ children }) {
  return (
    <div className="relative min-h-dvh">
      {/* Render the real header immediately so phones can tap menu/settings before hydration finishes. */}
      <ProjectMenu />
      <div className="min-w-0 pt-[var(--app-header-height)]">{children}</div>
    </div>
  )
}
