import SafetyHealthPageClient from "@/components/project/SafetyHealthPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function SafetyHealthPage({ params }) {
  const { projectId } = await params

  if (!isActiveProject(projectId)) {
    notFound()
  }

  return <SafetyHealthPageClient projectId={projectId} />
}
