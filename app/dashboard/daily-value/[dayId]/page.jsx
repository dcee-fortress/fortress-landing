import { redirect } from "next/navigation"
import { DEFAULT_PROJECT_ID } from "@/lib/projectList"

export default async function LegacyDailyFilePage({ params }) {
  const { dayId } = await params
  redirect(`/project/${DEFAULT_PROJECT_ID}/dashboard/daily-value/${dayId}`)
}
