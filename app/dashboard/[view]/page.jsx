import { redirect } from "next/navigation"
import { DEFAULT_PROJECT_ID } from "@/lib/projectList"
import { isValidDashboardView } from "@/lib/projectRoutes"
import { notFound } from "next/navigation"

export default async function LegacyDashboardPage({ params }) {
  const { view } = await params

  if (!isValidDashboardView(view)) {
    notFound()
  }

  redirect(`/project/${DEFAULT_PROJECT_ID}/dashboard/${view}`)
}
