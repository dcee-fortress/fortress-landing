import QsOverviewPeriodPageClient from "@/components/project/QsOverviewPeriodPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function QsOverviewProjectToDatePage({ params }) {
  const { projectId } = await params

  if (!isActiveProject(projectId)) {
    notFound()
  }

  return <QsOverviewPeriodPageClient projectId={projectId} period="project-to-date" />
}
