import { redirect } from "next/navigation"
import { DEFAULT_PROJECT_ID } from "@/lib/projectList"

export default function LegacyDailyValuePage() {
  redirect(`/project/${DEFAULT_PROJECT_ID}/dashboard/daily-value`)
}
