"use client"

import { notFound } from "next/navigation"
import { useProjects } from "@/components/project/ProjectsProvider"
import PlantOperatorRegisterView from "@/components/project/PlantOperatorRegisterView"
import { getPlantOperatorRegisterFile } from "@/lib/plantOperatorRegisters"

export default function PlantOperatorRegisterPageClient({ projectId, monthId }) {
  const { getProject } = useProjects()
  const project = getProject(projectId)
  const file = getPlantOperatorRegisterFile(projectId, monthId)

  if (!project || !file) {
    notFound()
  }

  return (
    <div className="h-screen overflow-y-auto bg-zinc-50 p-6 text-zinc-900">
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
