import CashBookRollupPageClient from "@/components/project/CashBookRollupPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function WeeklyFoodCashPage({ params }) {
  const { projectId } = await params

  if (!isActiveProject(projectId)) {
    notFound()
  }

  return (
    <CashBookRollupPageClient
      projectId={projectId}
      bookId="food-cash"
      title="Weekly food cash"
      description="Weekly food cash totals rolled up from daily entries."
      mode="weekly"
    />
  )
}
