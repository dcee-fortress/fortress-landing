"use client"

import { notFound } from "next/navigation"
import PettyCashEntryView from "@/components/project/PettyCashEntryView"
import PageLoadingShell from "@/components/project/PageLoadingShell"
import RestrictedAreaGate from "@/components/project/RestrictedAreaGate"
import { useHydratedProjectRoute } from "@/hooks/useHydratedProjectRoute"
import { getDailyFile } from "@/lib/projectFiles"
import {
  isFinanceEntryRemembered,
  unlockFinanceEntry,
  validateFinanceEntryCredentials,
} from "@/lib/financeEntryAuth"

export default function PettyCashEntryPageClient({ projectId, dayId }) {
  const { isReady, syncReady, project, item: file } = useHydratedProjectRoute(
    projectId,
    () => getDailyFile(projectId, dayId)
  )

  if (!isReady) {
    return <PageLoadingShell />
  }

  if (syncReady && !file) {
    notFound()
  }

  if (!file) {
    return <PageLoadingShell />
  }

  return (
    <RestrictedAreaGate
      title="Petty cash entry"
      description="Enter the finance username and password to open this entry form. Without saving, you will be asked again next time."
      validateCredentials={validateFinanceEntryCredentials}
      unlock={unlockFinanceEntry}
      isRemembered={isFinanceEntryRemembered}
    >
      <div className="app-page-frame text-zinc-900">
        <div className="app-content-shell">
          <PettyCashEntryView
            projectId={projectId}
            projectName={project?.name || ""}
            dayId={dayId}
          />
        </div>
      </div>
    </RestrictedAreaGate>
  )
}
