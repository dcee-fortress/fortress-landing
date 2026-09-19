import PpeIssuedRollupPageClient from "@/components/project/PpeIssuedRollupPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function WeeklyPpeIssuedPage({ params }) {
  const { projectId } = await params

  if (!isActiveProject(projectId)) {
    notFound()
  }

  return (
    <PpeIssuedRollupPageClient
      projectId={projectId}
      title="Weekly PPE issued"
      description="Weekly table of PPE description, quantities, and total cost rolled up from daily PPE issued entries."
      mode="weekly"
    />
  )
}
