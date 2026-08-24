import WeeklyValuePageClient from "@/components/project/WeeklyValuePageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function WeeklyValuePage({ params }) {
  const { projectId } = await params

  if (!isActiveProject(projectId)) {
    notFound()
  }

  return <WeeklyValuePageClient projectId={projectId} />
}
