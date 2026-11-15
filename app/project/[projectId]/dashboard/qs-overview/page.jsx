import QsOverviewPageClient from "@/components/project/QsOverviewPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function QsOverviewPage({ params }) {
  const { projectId } = await params

  if (!isActiveProject(projectId)) {
    notFound()
  }

  return <QsOverviewPageClient projectId={projectId} />
}
