import PpeReceivedRollupPageClient from "@/components/project/PpeReceivedRollupPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function MonthlyPpeReceivedPage({ params }) {
  const { projectId } = await params

  if (!isActiveProject(projectId)) {
    notFound()
  }

  return (
    <PpeReceivedRollupPageClient
      projectId={projectId}
      title="Monthly PPE received"
      description="Monthly table of PPE description, quantities, and total cost rolled up from daily PPE received entries."
      mode="monthly"
    />
  )
}
