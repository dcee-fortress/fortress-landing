"use client"

import { notFound } from "next/navigation"
import GoodsAcquiredEntryView from "@/components/project/GoodsAcquiredEntryView"
import PageLoadingShell from "@/components/project/PageLoadingShell"
import RestrictedAreaGate from "@/components/project/RestrictedAreaGate"
import { useHydratedProjectRoute } from "@/hooks/useHydratedProjectRoute"
import { getGoodsAcquiredDailyFile } from "@/lib/goodsAcquired"
import {
  FINANCE_ENTRY_REMEMBER_KEY,
  isFinanceEntryRemembered,
  unlockFinanceEntry,
  validateFinanceEntryCredentials,
} from "@/lib/financeEntryAuth"

export default function GoodsAcquiredEntryPageClient({ projectId, dayId }) {
  const { isReady, syncReady, project, item: file } = useHydratedProjectRoute(
    projectId,
    () => getGoodsAcquiredDailyFile(projectId, dayId)
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
      title="Fuel requested entry"
      description="Enter the finance username and password to open this entry form. Without saving, you will be asked again next time."
      validateCredentials={validateFinanceEntryCredentials}
      unlock={unlockFinanceEntry}
      isRemembered={isFinanceEntryRemembered}
      rememberKey={FINANCE_ENTRY_REMEMBER_KEY}
    >
      <div className="app-page-frame text-zinc-900">
        <div className="app-content-shell">
          <GoodsAcquiredEntryView
            projectId={projectId}
            projectName={project?.name || ""}
            dayId={dayId}
          />
        </div>
      </div>
    </RestrictedAreaGate>
  )
}
