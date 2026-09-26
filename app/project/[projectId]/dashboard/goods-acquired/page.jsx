import GoodsAcquiredPageClient from "@/components/project/GoodsAcquiredPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function GoodsAcquiredPage({ params }) {
  const { projectId } = await params
  if (!isActiveProject(projectId)) notFound()
  return <GoodsAcquiredPageClient projectId={projectId} />
}
