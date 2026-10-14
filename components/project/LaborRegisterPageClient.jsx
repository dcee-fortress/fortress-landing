"use client"

import { notFound } from "next/navigation"
import PageLoadingShell from "@/components/project/PageLoadingShell"
import { useProjects } from "@/components/project/ProjectsProvider"
import LaborRegisterView from "@/components/project/LaborRegisterView"
import { useHydratedProjectRoute } from "@/hooks/useHydratedProjectRoute"
import { getLaborRegisterFile } from "@/lib/laborRegisters"

export default function LaborRegisterPageClient({ projectId, monthId }) {
  const { version } = useProjects()
  const { isReady, project, item: file } = useHydratedProjectRoute(projectId, () => {
    void version
    return getLaborRegisterFile(projectId, monthId)
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
        <LaborRegisterView
          projectName={project.name}
          projectId={projectId}
          file={file}
        />
      </div>
    </div>
  )
}
