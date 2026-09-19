import DailyPettyCashListPageClient from "@/components/project/DailyPettyCashListPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function DailyPettyCashListPage({ params }) {
  const { projectId } = await params

  if (!isActiveProject(projectId)) {
    notFound()
  }

  return <DailyPettyCashListPageClient projectId={projectId} />
}
