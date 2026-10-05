import DailyCashBookListPageClient from "@/components/project/DailyCashBookListPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function DailyFoodCashListPage({ params }) {
  const { projectId } = await params

  if (!isActiveProject(projectId)) {
    notFound()
  }

  return <DailyCashBookListPageClient projectId={projectId} bookId="food-cash" />
}
