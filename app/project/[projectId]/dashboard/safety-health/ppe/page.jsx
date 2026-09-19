import PersonalProtectiveEquipmentPageClient from "@/components/project/PersonalProtectiveEquipmentPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function PersonalProtectiveEquipmentPage({ params }) {
  const { projectId } = await params

  if (!isActiveProject(projectId)) {
    notFound()
  }

  return <PersonalProtectiveEquipmentPageClient projectId={projectId} />
}
