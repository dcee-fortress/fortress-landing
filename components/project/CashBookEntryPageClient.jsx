"use client"

import { notFound } from "next/navigation"
import CashBookEntryView from "@/components/project/CashBookEntryView"
import PageLoadingShell from "@/components/project/PageLoadingShell"
import RestrictedAreaGate from "@/components/project/RestrictedAreaGate"
import { useHydratedProjectRoute } from "@/hooks/useHydratedProjectRoute"
import { getCashBook } from "@/lib/cashBooks"
import { getDailyFile } from "@/lib/projectFiles"
import {
  FINANCE_ENTRY_REMEMBER_KEY,
  isFinanceEntryRemembered,
  unlockFinanceEntry,
  validateFinanceEntryCredentials,
} from "@/lib/financeEntryAuth"

export default function CashBookEntryPageClient({ projectId, dayId, bookId }) {
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
      title={`${getCashBook(bookId).label} entry`}
      description="Enter the finance username and password to open this entry form. Without saving, you will be asked again next time."
      validateCredentials={validateFinanceEntryCredentials}
      unlock={unlockFinanceEntry}
      isRemembered={isFinanceEntryRemembered}
      rememberKey={FINANCE_ENTRY_REMEMBER_KEY}
    >
      <div className="app-page-frame text-zinc-900">
        <div className="app-content-shell">
          <CashBookEntryView
            projectId={projectId}
            projectName={project?.name || ""}
            dayId={dayId}
            bookId={bookId}
          />
        </div>
      </div>
    </RestrictedAreaGate>
  )
}
