import PlantOperatorRegisterPageClient from "@/components/project/PlantOperatorRegisterPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function PlantOperatorRegisterPage({ params }) {
  const { projectId, monthId } = await params

  if (!isActiveProject(projectId)) {
    notFound()
  }

  return <PlantOperatorRegisterPageClient projectId={projectId} monthId={monthId} />
}
