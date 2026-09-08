"use client"

import ChoiceCard from "@/components/project/ChoiceCard"
import Icon from "@/components/icon/icon"
import Link from "next/link"
import BoqUploadPanel from "@/components/project/BoqUploadPanel"
import { useProjectData } from "@/components/project/ProjectDataProvider"
import { getProjectHomeHref } from "@/lib/projectRoutes"
import { getRateAnalysisPeriodHref, RATE_ANALYSIS_PERIODS } from "@/lib/rateAnalysis"

export default function RateAnalysisView({ projectId, projectName }) {
  const { version, refresh } = useProjectData()

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link
          href={getProjectHomeHref(projectId)}
          className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
        >
          <Icon name="arrow-left" size={16} />
          Back to project home
        </Link>
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">Rate Analysis</p>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">{projectName}</h1>
        <p className="max-w-2xl text-zinc-500">
          Upload and manage Excel BOQs here, then open Daily, Weekly, Monthly, or Project to date to
          compare valuation rates against each BOQ.
        </p>
      </header>

      <BoqUploadPanel projectId={projectId} projectName={projectName} onUploaded={refresh} version={version} />

      <div className="app-choice-grid app-choice-grid--4">
        {RATE_ANALYSIS_PERIODS.map((item) => (
          <ChoiceCard
            key={item.period}
            href={getRateAnalysisPeriodHref(projectId, item.period)}
            icon={item.icon}
            title={item.label}
            description={item.description}
            iconClassName="app-icon-tile--emerald"
          />
        ))}
      </div>
    </div>
  )
}
