import { redirect } from "next/navigation"

export default async function PlantOperatorsRedirectPage({ params }) {
  const { projectId } = await params
  redirect(`/project/${projectId}/dashboard/safety-health/plant-register`)
}
