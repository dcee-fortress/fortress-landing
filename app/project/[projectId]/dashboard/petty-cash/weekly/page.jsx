import PettyCashRollupPageClient from "@/components/project/PettyCashRollupPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function WeeklyPettyCashPage({ params }) {
  const { projectId } = await params

  if (!isActiveProject(projectId)) {
    notFound()
  }

  return (
    <PettyCashRollupPageClient
      projectId={projectId}
      title="Weekly petty cash"
      description="Weekly petty cash totals rolled up from daily entries."
      mode="weekly"
    />
  )
}
