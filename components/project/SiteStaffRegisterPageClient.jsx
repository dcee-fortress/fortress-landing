"use client"

import { notFound } from "next/navigation"
import PageLoadingShell from "@/components/project/PageLoadingShell"
import { useProjects } from "@/components/project/ProjectsProvider"
import SiteStaffRegisterView from "@/components/project/SiteStaffRegisterView"
import { useHydratedProjectRoute } from "@/hooks/useHydratedProjectRoute"
import { getSiteStaffRegisterFile } from "@/lib/siteStaffRegisters"

export default function SiteStaffRegisterPageClient({ projectId, monthId }) {
  const { version } = useProjects()
  const { isReady, project, item: file } = useHydratedProjectRoute(projectId, () => {
    void version
    return getSiteStaffRegisterFile(projectId, monthId)
  })

  if (!isReady) {
    return <PageLoadingShell />
  }

  if (!project || !file) {
    notFound()
  }

  return (
    <div className="app-page-frame min-w-0 text-zinc-900">
      <div className="mx-auto w-full min-w-0">
        <SiteStaffRegisterView
          projectName={project.name}
          projectId={projectId}
          file={file}
        />
      </div>
    </div>
  )
}
