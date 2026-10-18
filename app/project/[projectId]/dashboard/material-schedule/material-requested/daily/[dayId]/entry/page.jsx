import GoodsAcquiredEntryPageClient from "@/components/project/GoodsAcquiredEntryPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function GoodsAcquiredEntryPage({ params }) {
  const { projectId, dayId } = await params
  if (!isActiveProject(projectId)) notFound()
  return <GoodsAcquiredEntryPageClient projectId={projectId} dayId={dayId} />
}
