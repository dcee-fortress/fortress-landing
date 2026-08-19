import DailyValuePageClient from "@/components/project/DailyValuePageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function DailyValuePage({ params }) {
  const { projectId } = await params

  if (!isActiveProject(projectId)) {
    notFound()
  }

  return <DailyValuePageClient projectId={projectId} />
}
