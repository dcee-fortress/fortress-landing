import { redirect } from "next/navigation"

export default async function PlantOperatorMonthRedirectPage({ params }) {
  const { projectId, monthId } = await params
  redirect(`/project/${projectId}/dashboard/safety-health/plant-register/${monthId}`)
}
