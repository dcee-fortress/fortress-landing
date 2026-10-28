import GoodsAcquiredRollupPageClient from "@/components/project/GoodsAcquiredRollupPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function GoodsAcquiredprojecttodatePage({ params }) {
  const { projectId } = await params
  if (!isActiveProject(projectId)) notFound()
  return (
    <GoodsAcquiredRollupPageClient
      projectId={projectId}
      title="Project to date bulk fuel inserted in tank"
      description="Each fuel name is one line. Bulk fuel inserted in tank quantities and total costs from every daily entry are added together."
      mode="project-to-date"
    />
  )
}
