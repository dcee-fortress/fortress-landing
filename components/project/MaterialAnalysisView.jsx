"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Icon from "@/components/icon/icon"
import MaterialRegisterTable from "@/components/project/MaterialRegisterTable"
import TableExportButtons from "@/components/project/TableExportButtons"
import { useProjects } from "@/components/project/ProjectsProvider"
import { getMaterialAnalysisRows } from "@/lib/materialSiteStock"
import { getMaterialAnalysisDetailsHref, getSiteMaterialScheduleHref } from "@/lib/projectRoutes"

const COLUMNS = [
  { key: "description", label: "Description", align: "left", kind: "text" },
  { key: "requestedQuantity", label: "Bulk material requested", align: "right", kind: "number" },
  { key: "receivedQuantity", label: "Cumulative material received", align: "right", kind: "number" },
  { key: "materialLeft", label: "Balance of material left", align: "right", kind: "number" },
]

export default function MaterialAnalysisView({ projectId, projectName }) {
  const { version } = useProjects()
  const [ready, setReady] = useState(false)
  useEffect(() => {
    setReady(true)
  }, [])
  // Read grove after mount so SSR and the first client paint match (avoids hydration overlay).
  const lines = ready ? getMaterialAnalysisRows(projectId) : []
  void version

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link
          href={getSiteMaterialScheduleHref(projectId)}
          className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
        >
          <Icon name="arrow-left" size={16} />
          Back to Material schedule
        </Link>
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">Material analysis</p>
        <h1
          suppressHydrationWarning
          className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl lg:text-4xl"
        >
          {projectName || "Project"}
        </h1>
        <p className="max-w-3xl text-sm text-zinc-500 sm:text-base">
          Read-only project to date. Similar descriptions are one line. Balance of material left
          is bulk material requested minus cumulative material received.
        </p>
      </header>

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3 sm:px-5">
          <h2 className="text-base font-semibold text-zinc-900">Project to date</h2>
          <TableExportButtons
            columns={COLUMNS}
            rows={lines}
            title="Material analysis"
            projectName={projectName}
            filename="material-analysis"
            showTotal={false}
          />
        </div>
        <MaterialRegisterTable
          columns={COLUMNS}
          lines={lines}
          showTotal={false}
          emptyMessage="No bulk material request or material received yet."
        />
        <div className="border-t border-zinc-200 px-4 py-4 sm:px-5">
          <Link
            href={getMaterialAnalysisDetailsHref(projectId)}
            className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800"
          >
            Details
          </Link>
        </div>
      </section>
    </div>
  )
}
