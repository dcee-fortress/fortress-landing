"use client"

import { notFound } from "next/navigation"
import PageLoadingShell from "@/components/project/PageLoadingShell"
import { useProjects } from "@/components/project/ProjectsProvider"
import PlantOperatorRegisterView from "@/components/project/PlantOperatorRegisterView"
import { useHydratedProjectRoute } from "@/hooks/useHydratedProjectRoute"
import { getPlantOperatorRegisterFile } from "@/lib/plantOperatorRegisters"

export default function PlantOperatorRegisterPageClient({ projectId, monthId }) {
  const { version } = useProjects()
  const { isReady, project, item: file } = useHydratedProjectRoute(projectId, () => {
    void version
    return getPlantOperatorRegisterFile(projectId, monthId)
  })

  if (!isReady) {
    return <PageLoadingShell />
  }

  if (!project || !file) {
    notFound()
  }

  return (
    <div className="app-page-frame text-zinc-900">
      <div className="mx-auto max-w-[1400px]">
        <PlantOperatorRegisterView
          projectName={project.name}
          projectId={projectId}
          file={file}
        />
      </div>
    </div>
  )
}
