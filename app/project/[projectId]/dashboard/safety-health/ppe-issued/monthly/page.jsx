import PpeIssuedRollupPageClient from "@/components/project/PpeIssuedRollupPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function MonthlyPpeIssuedPage({ params }) {
  const { projectId } = await params

  if (!isActiveProject(projectId)) {
    notFound()
  }

  return (
    <PpeIssuedRollupPageClient
      projectId={projectId}
      title="Monthly PPE issued"
      description="Monthly table of PPE description, quantities, and total cost rolled up from daily PPE issued entries."
      mode="monthly"
    />
  )
}
