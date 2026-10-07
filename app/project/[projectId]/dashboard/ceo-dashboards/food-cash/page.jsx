import CeoCashBookPageClient from "@/components/project/CeoCashBookPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function CeoFoodCashPage({ params }) {
  const { projectId } = await params

  if (!isActiveProject(projectId)) {
    notFound()
  }

  return (
    <CeoCashBookPageClient projectId={projectId} bookId="food-cash" title="Total food and catering cost" />
  )
}
