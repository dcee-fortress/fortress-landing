import CeoCashBookPageClient from "@/components/project/CeoCashBookPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function CeoPettyCashPage({ params }) {
  const { projectId } = await params

  if (!isActiveProject(projectId)) {
    notFound()
  }

  return <CeoCashBookPageClient projectId={projectId} bookId="petty-cash" title="Total petty cash spent" />
}
