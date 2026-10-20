import { redirect } from "next/navigation"

export default async function GoodsAnalysisRedirectPage({ params }) {
  const { projectId } = await params
  redirect(`/project/${projectId}/dashboard/fuel-schedule/fuel-analysis`)
}
