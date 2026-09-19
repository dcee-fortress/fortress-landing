import DailyPpeReceivedListPageClient from "@/components/project/DailyPpeReceivedListPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function DailyPpeReceivedPage({ params }) {
  const { projectId } = await params

  if (!isActiveProject(projectId)) {
    notFound()
  }

  return <DailyPpeReceivedListPageClient projectId={projectId} />
}
