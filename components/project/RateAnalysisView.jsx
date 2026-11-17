"use client"

import ChoiceCard from "@/components/project/ChoiceCard"
import Icon from "@/components/icon/icon"
import Link from "next/link"
import BoqUploadPanel from "@/components/project/BoqUploadPanel"
import { useProjectData } from "@/components/project/ProjectDataProvider"
import { getQsOverviewHref } from "@/lib/qsOverview"
import { getActualCostAnalysisHref } from "@/lib/rateAnalysis"

export default function RateAnalysisView({ projectId, projectName }) {
  const { version, refresh } = useProjectData()

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link
          href={getQsOverviewHref(projectId)}
          className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
        >
          <Icon name="arrow-left" size={16} />
          Back to Head QS Overview
        </Link>
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">Rate analysis</p>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">{projectName}</h1>
        <p className="max-w-2xl text-zinc-500">
          Upload a BOQ as PDF or Excel, then open Rate build up to price each BOQ description.
        </p>
      </header>

      <BoqUploadPanel projectId={projectId} projectName={projectName} onUploaded={refresh} version={version} />

      <div className="app-choice-grid">
        <ChoiceCard
          href={getActualCostAnalysisHref(projectId)}
          icon="calculator"
          title="Rate build up"
          description="BOQ descriptions with materials, overheads, profit, and the rates used by Head QS Overview."
          iconClassName="app-icon-tile--emerald"
        />
      </div>
    </div>
  )
}
