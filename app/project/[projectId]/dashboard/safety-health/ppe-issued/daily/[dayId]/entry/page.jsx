import PpeIssuedEntryPageClient from "@/components/project/PpeIssuedEntryPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function PpeIssuedEntryPage({ params }) {
  const { projectId, dayId } = await params

  if (!isActiveProject(projectId)) {
    notFound()
  }

  return <PpeIssuedEntryPageClient projectId={projectId} dayId={dayId} />
}
