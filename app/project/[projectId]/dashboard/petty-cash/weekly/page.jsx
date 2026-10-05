import CashBookRollupPageClient from "@/components/project/CashBookRollupPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function WeeklyPettyCashPage({ params }) {
  const { projectId } = await params

  if (!isActiveProject(projectId)) {
    notFound()
  }

  return (
    <CashBookRollupPageClient
      projectId={projectId}
      bookId="petty-cash"
      title="Weekly petty cash"
      description="Weekly petty cash totals rolled up from daily entries."
      mode="weekly"
    />
  )
}
