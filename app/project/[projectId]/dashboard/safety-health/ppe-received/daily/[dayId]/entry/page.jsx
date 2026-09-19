import PpeReceivedEntryPageClient from "@/components/project/PpeReceivedEntryPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function PpeReceivedEntryPage({ params }) {
  const { projectId, dayId } = await params

  if (!isActiveProject(projectId)) {
    notFound()
  }

  return <PpeReceivedEntryPageClient projectId={projectId} dayId={dayId} />
}
