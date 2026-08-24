"use client"

import { ProjectsProvider } from "@/components/project/ProjectsProvider"
import DashboardShell from "@/components/project/DashboardShell"

export default function AppShell({ children }) {
  return (
    <ProjectsProvider>
      <DashboardShell>{children}</DashboardShell>
    </ProjectsProvider>
  )
}
