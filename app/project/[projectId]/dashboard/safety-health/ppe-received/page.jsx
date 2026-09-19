import PpeReceivedPageClient from "@/components/project/PpeReceivedPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function PpeReceivedPage({ params }) {
  const { projectId } = await params

  if (!isActiveProject(projectId)) {
    notFound()
  }

  return <PpeReceivedPageClient projectId={projectId} />
}
