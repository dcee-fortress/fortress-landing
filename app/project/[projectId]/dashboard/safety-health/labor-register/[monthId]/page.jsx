import LaborRegisterPageClient from "@/components/project/LaborRegisterPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function LaborRegisterPage({ params }) {
  const { projectId, monthId } = await params

  if (!isActiveProject(projectId)) {
    notFound()
  }

  return <LaborRegisterPageClient projectId={projectId} monthId={monthId} />
}
