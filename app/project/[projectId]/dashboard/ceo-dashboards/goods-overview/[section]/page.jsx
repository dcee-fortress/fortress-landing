import CeoGoodsOverviewTablePageClient from "@/components/project/CeoGoodsOverviewTablePageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

const SECTIONS = new Set(["ordered", "received", "pending"])

export default async function CeoGoodsOverviewSectionPage({ params }) {
  const { projectId, section } = await params

  if (!isActiveProject(projectId) || !SECTIONS.has(section)) {
    notFound()
  }

  return <CeoGoodsOverviewTablePageClient projectId={projectId} mode={section} />
}
