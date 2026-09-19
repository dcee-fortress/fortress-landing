import DailyPpeIssuedListPageClient from "@/components/project/DailyPpeIssuedListPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function DailyPpeIssuedPage({ params }) {
  const { projectId } = await params

  if (!isActiveProject(projectId)) {
    notFound()
  }

  return <DailyPpeIssuedListPageClient projectId={projectId} />
}
