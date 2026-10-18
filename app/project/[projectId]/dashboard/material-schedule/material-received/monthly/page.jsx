import GoodsReceivedRollupPageClient from "@/components/project/GoodsReceivedRollupPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function MonthlyGoodsReceivedPage({ params }) {
  const { projectId } = await params

  if (!isActiveProject(projectId)) {
    notFound()
  }

  return (
    <GoodsReceivedRollupPageClient
      projectId={projectId}
      title="Monthly material received"
      description="Monthly table of description, unit, quantity, total cost, and current material balance rolled up from daily material received entries."
      mode="monthly"
    />
  )
}
