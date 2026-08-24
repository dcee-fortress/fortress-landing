import { redirect } from "next/navigation"
import { DEFAULT_PROJECT_ID } from "@/lib/projectList"

export default async function LegacyMonthlyFilePage({ params }) {
  const { monthId } = await params
  redirect(`/project/${DEFAULT_PROJECT_ID}/dashboard/monthly-value/${monthId}`)
}
