import QsSchedulesPageClient from "@/components/project/QsSchedulesPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function QsSchedulesPage({ params }) {
  const { projectId } = await params
  if (!isActiveProject(projectId)) notFound()
  return <QsSchedulesPageClient projectId={projectId} />
}
