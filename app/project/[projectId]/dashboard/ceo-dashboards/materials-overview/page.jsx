import CeoMaterialsOverviewPageClient from "@/components/project/CeoMaterialsOverviewView"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function CeoMaterialsOverviewPage({ params }) {
  const { projectId } = await params
  if (!isActiveProject(projectId)) notFound()
  return <CeoMaterialsOverviewPageClient projectId={projectId} />
}
