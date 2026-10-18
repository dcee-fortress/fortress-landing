import { redirect } from "next/navigation"

export default async function GoodsAnalysisRedirectPage({ params }) {
  const { projectId } = await params
  redirect(`/project/${projectId}/dashboard/material-schedule/material-analysis`)
}
