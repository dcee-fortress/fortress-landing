import SafetyReportsPageClient from "@/components/project/SafetyReportsPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function SafetyReportsPage({ params }) {
  const { projectId } = await params

  if (!isActiveProject(projectId)) {
    notFound()
  }

  return <SafetyReportsPageClient projectId={projectId} />
}
