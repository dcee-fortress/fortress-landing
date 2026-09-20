import PpeRegistersPageClient from "@/components/project/PpeRegistersPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function PpeRegistersPage({ params }) {
  const { projectId } = await params

  if (!isActiveProject(projectId)) {
    notFound()
  }

  return <PpeRegistersPageClient projectId={projectId} />
}
