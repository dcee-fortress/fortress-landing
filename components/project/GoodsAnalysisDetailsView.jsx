"use client"

import Link from "next/link"
import Icon from "@/components/icon/icon"
import MaterialRegisterTable from "@/components/project/MaterialRegisterTable"
import { useProjectData } from "@/components/project/ProjectDataProvider"
import { useHasHydrated } from "@/hooks/useHasHydrated"
import { getFuelAnalysisRows } from "@/lib/goodsOverview"
import { getGoodsAnalysisHref } from "@/lib/projectRoutes"

const COLUMNS = [
  { key: "description", label: "Description", align: "left", kind: "text" },
  { key: "bulkCost", label: "Bulk fuel cost", align: "right", kind: "computed" },
  { key: "consumedCost", label: "Fuel consumed cost", align: "right", kind: "computed" },
  { key: "leftCost", label: "Fuel left in tank cost", align: "right", kind: "computed" },
]

export default function GoodsAnalysisDetailsView({ projectId, projectName }) {
  const hasHydrated = useHasHydrated()
  const { version } = useProjectData()
  void version
  const lines = hasHydrated ? getFuelAnalysisRows(projectId) : []

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link
          href={getGoodsAnalysisHref(projectId)}
          className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
        >
          <Icon name="arrow-left" size={16} />
          Back to Fuel analysis
        </Link>
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">Details</p>
        <h1
          suppressHydrationWarning
          className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl lg:text-4xl"
        >
          {projectName || "Project"}
        </h1>
        <p className="max-w-3xl text-sm text-zinc-500 sm:text-base">
          Read-only project to date costs. Fuel left in tank cost is bulk fuel cost minus fuel
          consumed cost.
        </p>
      </header>

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 px-4 py-3 sm:px-5">
          <h2 className="text-base font-semibold text-zinc-900">Fuel costs</h2>
        </div>
        {!hasHydrated ? (
          <p className="px-6 py-12 text-center text-sm text-zinc-500">Loading fuel costs…</p>
        ) : (
          <MaterialRegisterTable
            columns={COLUMNS}
            lines={lines}
            showTotal={false}
            emptyMessage="No fuel costs yet."
          />
        )}
      </section>
    </div>
  )
}
