import RateAnalysisDetailPageClient from "@/components/project/RateAnalysisDetailPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function RateAnalysisProjectToDatePage({ params }) {
  const { projectId } = await params

  if (!isActiveProject(projectId)) {
    notFound()
  }

  return (
    <RateAnalysisDetailPageClient
      projectId={projectId}
      period="project-to-date"
      fileId="project-to-date"
    />
  )
}
