"use client"

import { notFound } from "next/navigation"
import PpeReceivedEntryView from "@/components/project/PpeReceivedEntryView"
import PageLoadingShell from "@/components/project/PageLoadingShell"
import RestrictedAreaGate from "@/components/project/RestrictedAreaGate"
import { useHydratedProjectRoute } from "@/hooks/useHydratedProjectRoute"
import { getDailyFile } from "@/lib/projectFiles"
import {
  isPpeEntryRemembered,
  unlockPpeEntry,
  validatePpeEntryCredentials,
} from "@/lib/ppeEntryAuth"

export default function PpeReceivedEntryPageClient({ projectId, dayId }) {
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
      title="PPE received entry"
      description="Enter the PPE username and password to open this entry form. Without saving, you will be asked again next time."
      validateCredentials={validatePpeEntryCredentials}
      unlock={unlockPpeEntry}
      isRemembered={isPpeEntryRemembered}
    >
      <div className="app-page-frame text-zinc-900">
        <div className="app-content-shell">
          <PpeReceivedEntryView
            projectId={projectId}
            projectName={project?.name || ""}
            dayId={dayId}
          />
        </div>
      </div>
    </RestrictedAreaGate>
  )
}
