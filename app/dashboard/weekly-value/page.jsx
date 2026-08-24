import { redirect } from "next/navigation"
import { DEFAULT_PROJECT_ID } from "@/lib/projectList"

export default function LegacyWeeklyValuePage() {
  redirect(`/project/${DEFAULT_PROJECT_ID}/dashboard/weekly-value`)
}
