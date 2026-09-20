"use client"

import { notFound } from "next/navigation"
import PageLoadingShell from "@/components/project/PageLoadingShell"
import { useProjects } from "@/components/project/ProjectsProvider"
import InductionRegisterView from "@/components/project/InductionRegisterView"
import { useHydratedProjectRoute } from "@/hooks/useHydratedProjectRoute"
import { getInductionRegisterFile } from "@/lib/inductionRegisters"

export default function InductionRegisterPageClient({ projectId, monthId }) {
  const { version } = useProjects()
  const { isReady, project, item: file } = useHydratedProjectRoute(projectId, () => {
    void version
    return getInductionRegisterFile(projectId, monthId)
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
        <InductionRegisterView
          projectName={project.name}
          projectId={projectId}
          file={file}
        />
      </div>
    </div>
  )
}
