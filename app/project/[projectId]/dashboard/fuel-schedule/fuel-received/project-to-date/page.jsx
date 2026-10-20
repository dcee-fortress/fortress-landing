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
      title="Project to date bulk fuel in tank"
      description="Project-wide table of description, unit, quantity, total cost, and fuel left. Similar descriptions are written as one line and their quantities are added together."
      mode="project-to-date"
    />
  )
}
