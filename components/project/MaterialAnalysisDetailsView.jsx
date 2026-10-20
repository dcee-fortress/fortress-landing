"use client"

import Link from "next/link"
import Icon from "@/components/icon/icon"
import MaterialRegisterTable from "@/components/project/MaterialRegisterTable"
import { useProjects } from "@/components/project/ProjectsProvider"
import { getMaterialAnalysisRows } from "@/lib/materialSiteStock"
import { getMaterialAnalysisHref } from "@/lib/projectRoutes"

const COLUMNS = [
  { key: "description", label: "Description", align: "left", kind: "text" },
  { key: "requestCost", label: "Bulk request cost", align: "right", kind: "computed" },
  {
    key: "receivedCost",
    label: "Cumulative material received cost",
    align: "right",
    kind: "computed",
  },
  { key: "leftCost", label: "Balance of material left", align: "right", kind: "computed" },
]

export default function MaterialAnalysisDetailsView({ projectId, projectName }) {
  const { version } = useProjects()
  void version
  const lines = getMaterialAnalysisRows(projectId)

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link
          href={getMaterialAnalysisHref(projectId)}
          className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
        >
          <Icon name="arrow-left" size={16} />
          Back to Material analysis
        </Link>
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">Details</p>
        <h1
          suppressHydrationWarning
          className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl lg:text-4xl"
        >
          {projectName || "Project"}
        </h1>
        <p className="max-w-3xl text-sm text-zinc-500 sm:text-base">
          Read-only project to date costs. Received cost and the cost of material left use the
          unit price from the matching bulk material request. Similar descriptions are one line.
        </p>
      </header>

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 px-4 py-3 sm:px-5">
          <h2 className="text-base font-semibold text-zinc-900">Project to date costs</h2>
        </div>
        <MaterialRegisterTable
          columns={COLUMNS}
          lines={lines}
          showTotal={false}
          emptyMessage="No costs yet. Enter a bulk material request with a unit price first."
        />
      </section>
    </div>
  )
}
