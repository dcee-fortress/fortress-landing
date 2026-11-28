import GoodsReceivedRollupPageClient from "@/components/project/GoodsReceivedRollupPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function ProjectToDateGoodsReceivedPage({ params }) {
  const { projectId } = await params

  if (!isActiveProject(projectId)) {
    notFound()
  }

  return (
    <GoodsReceivedRollupPageClient
      projectId={projectId}
      title="Project to date fuel consumed"
      description="Same layout as daily fuel consumed — Fuel name, Unit, Quantity of fuel consumed, and Total cost. Each fuel name is one line with quantities and total costs added from every daily fuel consumed entry."
      mode="project-to-date"
    />
  )
}
