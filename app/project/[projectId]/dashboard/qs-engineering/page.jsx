import QsEngineeringPageClient from "@/components/project/QsEngineeringPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function QsEngineeringPage({ params }) {
  const { projectId } = await params

  if (!isActiveProject(projectId)) {
    notFound()
  }

  return <QsEngineeringPageClient projectId={projectId} />
}
