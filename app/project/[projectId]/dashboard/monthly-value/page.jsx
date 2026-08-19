import MonthlyValuePageClient from "@/components/project/MonthlyValuePageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function MonthlyValuePage({ params }) {
  const { projectId } = await params

  if (!isActiveProject(projectId)) {
    notFound()
  }

  return <MonthlyValuePageClient projectId={projectId} />
}
