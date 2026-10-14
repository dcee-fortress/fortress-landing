import MaterialSchedulesPageClient from "@/components/project/MaterialSchedulesPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function MaterialSchedulesPage({ params }) {
  const { projectId } = await params
  if (!isActiveProject(projectId)) notFound()
  return <MaterialSchedulesPageClient projectId={projectId} />
}
