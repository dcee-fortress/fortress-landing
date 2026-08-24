import { redirect } from "next/navigation"
import { DEFAULT_PROJECT_ID } from "@/lib/projectList"

export default async function LegacyWeeklyFilePage({ params }) {
  const { weekId } = await params
  redirect(`/project/${DEFAULT_PROJECT_ID}/dashboard/weekly-value/${weekId}`)
}
