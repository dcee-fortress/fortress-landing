import EquipmentInUsePageClient from "@/components/project/EquipmentInUsePageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function EquipmentInUsePage({ params }) {
  const { projectId } = await params

  if (!isActiveProject(projectId)) {
    notFound()
  }

  return <EquipmentInUsePageClient projectId={projectId} />
}
