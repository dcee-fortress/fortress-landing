import GoodsReceivedPageClient from "@/components/project/GoodsReceivedPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function GoodsReceivedPage({ params }) {
  const { projectId } = await params

  if (!isActiveProject(projectId)) {
    notFound()
  }

  return <GoodsReceivedPageClient projectId={projectId} />
}
