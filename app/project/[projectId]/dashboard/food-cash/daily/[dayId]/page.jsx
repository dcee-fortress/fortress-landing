import DailyCashBookDayPageClient from "@/components/project/DailyCashBookDayPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function DailyFoodCashDayPage({ params }) {
  const { projectId, dayId } = await params

  if (!isActiveProject(projectId) || !/^\d{4}-\d{2}-\d{2}$/.test(dayId)) {
    notFound()
  }

  return <DailyCashBookDayPageClient projectId={projectId} dayId={dayId} bookId="food-cash" />
}
