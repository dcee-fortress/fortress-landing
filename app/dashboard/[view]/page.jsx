import { redirect } from "next/navigation"
import { isValidDashboardView } from "@/lib/projectRoutes"
import { notFound } from "next/navigation"

export default async function LegacyDashboardPage({ params }) {
  const { view } = await params

  if (!isValidDashboardView(view)) {
    notFound()
  }

  redirect("/")
}
