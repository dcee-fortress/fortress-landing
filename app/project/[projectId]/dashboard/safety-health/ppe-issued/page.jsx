import PpeIssuedPageClient from "@/components/project/PpeIssuedPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function PpeIssuedPage({ params }) {
  const { projectId } = await params

  if (!isActiveProject(projectId)) {
    notFound()
  }

  return <PpeIssuedPageClient projectId={projectId} />
}
