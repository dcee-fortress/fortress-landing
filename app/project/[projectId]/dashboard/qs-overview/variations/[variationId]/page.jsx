import ValuationVariationReviewPageClient from "@/components/project/ValuationVariationReviewPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function ValuationVariationReviewPage({ params }) {
  const { projectId, variationId } = await params

  if (!isActiveProject(projectId) || !variationId) {
    notFound()
  }

  return (
    <ValuationVariationReviewPageClient projectId={projectId} variationId={variationId} />
  )
}
