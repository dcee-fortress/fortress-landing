import GoodsReceivedEntryPageClient from "@/components/project/GoodsReceivedEntryPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function GoodsReceivedEntryPage({ params }) {
  const { projectId, dayId } = await params

  if (!isActiveProject(projectId)) {
    notFound()
  }

  return <GoodsReceivedEntryPageClient projectId={projectId} dayId={dayId} />
}
