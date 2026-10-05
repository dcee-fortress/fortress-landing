import CashBookPageClient from "@/components/project/CashBookPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function FoodCashPage({ params }) {
  const { projectId } = await params

  if (!isActiveProject(projectId)) {
    notFound()
  }

  return <CashBookPageClient projectId={projectId} bookId="food-cash" />
}
