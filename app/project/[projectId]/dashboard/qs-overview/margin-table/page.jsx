import QsMarginTablePageClient from "@/components/project/QsMarginTablePageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function QsMarginTablePage({ params }) {
  const { projectId } = await params

  if (!isActiveProject(projectId)) {
    notFound()
  }

  return <QsMarginTablePageClient projectId={projectId} />
}
