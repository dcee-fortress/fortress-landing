import { redirect } from "next/navigation"

export default async function Page({ params }) {
  const { projectId, dayId, weekId, monthId } = await params
  redirect(`/project/${projectId}/dashboard/fuel-schedule/fuel-received/project-to-date`)
}
