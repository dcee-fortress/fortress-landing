import PettyCashPageClient from "@/components/project/PettyCashPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function PettyCashPage({ params }) {
  const { projectId } = await params

  if (!isActiveProject(projectId)) {
    notFound()
  }

  return <PettyCashPageClient projectId={projectId} />
}
