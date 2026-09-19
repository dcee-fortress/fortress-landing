import PettyCashEntryPageClient from "@/components/project/PettyCashEntryPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function PettyCashEntryPage({ params }) {
  const { projectId, dayId } = await params

  if (!isActiveProject(projectId) || !/^\d{4}-\d{2}-\d{2}$/.test(dayId)) {
    notFound()
  }

  return <PettyCashEntryPageClient projectId={projectId} dayId={dayId} />
}
