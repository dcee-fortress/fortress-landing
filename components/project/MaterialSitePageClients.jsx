"use client"

import { notFound } from "next/navigation"
import MaterialAnalysisDetailsView from "@/components/project/MaterialAnalysisDetailsView"
import MaterialAnalysisView from "@/components/project/MaterialAnalysisView"
import MaterialSiteDailyListView from "@/components/project/MaterialSiteDailyListView"
import MaterialSiteDayView from "@/components/project/MaterialSiteDayView"
import MaterialSiteEntryView from "@/components/project/MaterialSiteEntryView"
import MaterialSiteHubView from "@/components/project/MaterialSiteHubView"
import MaterialSiteRollupView from "@/components/project/MaterialSiteRollupView"
import PageLoadingShell from "@/components/project/PageLoadingShell"
import RestrictedAreaGate from "@/components/project/RestrictedAreaGate"
import { useProjects } from "@/components/project/ProjectsProvider"
import { useHydratedProjectRoute } from "@/hooks/useHydratedProjectRoute"
import {
  FINANCE_ENTRY_REMEMBER_KEY,
  isFinanceEntryRemembered,
  unlockFinanceEntry,
  validateFinanceEntryCredentials,
} from "@/lib/financeEntryAuth"
import { getMaterialSiteDailyFile } from "@/lib/materialSiteStock"

function Frame({ children }) {
  return (
    <div className="app-page-frame text-zinc-900">
      <div className="app-content-shell">{children}</div>
    </div>
  )
}

function useName(projectId) {
  const { getProject } = useProjects()
  return getProject(projectId)?.name || ""
}

export function MaterialSiteHubPageClient({ projectId }) {
  return (
    <Frame>
      <MaterialSiteHubView projectId={projectId} projectName={useName(projectId)} />
    </Frame>
  )
}

export function MaterialSiteDailyPageClient({ projectId }) {
  return (
    <Frame>
      <MaterialSiteDailyListView projectId={projectId} projectName={useName(projectId)} />
    </Frame>
  )
}

export function MaterialSiteRollupPageClient({ projectId }) {
  return (
    <Frame>
      <MaterialSiteRollupView projectId={projectId} projectName={useName(projectId)} />
    </Frame>
  )
}

export function MaterialSiteDayPageClient({ projectId, dayId }) {
  const { isReady, syncReady, project, item: file } = useHydratedProjectRoute(projectId, () =>
    getMaterialSiteDailyFile(projectId, dayId)
  )

  if (!isReady || (!file && !syncReady)) return <PageLoadingShell />
  if (syncReady && !file) notFound()

  return (
    <Frame>
      <MaterialSiteDayView projectId={projectId} projectName={project?.name || ""} dayId={dayId} />
    </Frame>
  )
}

export function MaterialSiteEntryPageClient({ projectId, dayId }) {
  const { isReady, syncReady, project, item: file } = useHydratedProjectRoute(projectId, () =>
    getMaterialSiteDailyFile(projectId, dayId)
  )

  if (!isReady || (!file && !syncReady)) return <PageLoadingShell />
  if (syncReady && !file) notFound()

  return (
    <RestrictedAreaGate
      title="Material on site entry"
      description="Enter the finance username and password to open this entry form. Without saving, you will be asked again next time."
      validateCredentials={validateFinanceEntryCredentials}
      unlock={unlockFinanceEntry}
      isRemembered={isFinanceEntryRemembered}
      rememberKey={FINANCE_ENTRY_REMEMBER_KEY}
    >
      <Frame>
        <MaterialSiteEntryView projectId={projectId} projectName={project?.name || ""} dayId={dayId} />
      </Frame>
    </RestrictedAreaGate>
  )
}

export function MaterialAnalysisPageClient({ projectId }) {
  return (
    <Frame>
      <MaterialAnalysisView projectId={projectId} projectName={useName(projectId)} />
    </Frame>
  )
}

export function MaterialAnalysisDetailsPageClient({ projectId }) {
  return (
    <Frame>
      <MaterialAnalysisDetailsView projectId={projectId} projectName={useName(projectId)} />
    </Frame>
  )
}
