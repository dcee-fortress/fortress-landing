import LaborRegistersPageClient from "@/components/project/LaborRegistersPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function LaborRegistersPage({ params }) {
  const { projectId } = await params

  if (!isActiveProject(projectId)) {
    notFound()
  }

  return <LaborRegistersPageClient projectId={projectId} />
}
