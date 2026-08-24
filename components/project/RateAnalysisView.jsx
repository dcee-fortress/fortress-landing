"use client"

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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {RATE_ANALYSIS_PERIODS.map((item) => (
          <Link
            key={item.period}
            href={getRateAnalysisPeriodHref(projectId, item.period)}
            className="group flex items-start gap-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 hover:shadow-md"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 transition group-hover:bg-emerald-100">
              <Icon name={item.icon} size={22} />
            </div>
            <div className="space-y-1">
              <h2 className="font-semibold text-zinc-900">{item.label}</h2>
              <p className="text-sm leading-relaxed text-zinc-500">{item.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
