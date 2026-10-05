import CashBookEntryPageClient from "@/components/project/CashBookEntryPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function FoodCashEntryPage({ params }) {
  const { projectId, dayId } = await params

  if (!isActiveProject(projectId) || !/^\d{4}-\d{2}-\d{2}$/.test(dayId)) {
    notFound()
  }

  return <CashBookEntryPageClient projectId={projectId} dayId={dayId} bookId="food-cash" />
}
