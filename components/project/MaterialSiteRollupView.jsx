"use client"

import Link from "next/link"
import Icon from "@/components/icon/icon"
import MaterialRegisterTable from "@/components/project/MaterialRegisterTable"
import { useProjects } from "@/components/project/ProjectsProvider"
import { getMaterialSiteProjectLines } from "@/lib/materialSiteStock"
import { getMaterialSiteHref } from "@/lib/projectRoutes"

const COLUMNS = [
  { key: "description", label: "Description", align: "left", kind: "text" },
  { key: "storeroom", label: "Quantity in storeroom", align: "right", kind: "number" },
  { key: "materialUsed", label: "Material used", align: "right", kind: "number" },
  { key: "materialLeft", label: "Material left", align: "right", kind: "number" },
]

export default function MaterialSiteRollupView({ projectId, projectName }) {
  const { version } = useProjects()
  void version
  const lines = getMaterialSiteProjectLines(projectId)

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link
          href={getMaterialSiteHref(projectId)}
          className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
        >
          <Icon name="arrow-left" size={16} />
          Back to Material on site
        </Link>
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">Project to date</p>
        <h1
          suppressHydrationWarning
          className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl lg:text-4xl"
        >
          {projectName || "Project"}
        </h1>
        <p className="max-w-3xl text-sm text-zinc-500 sm:text-base">
          Cumulative storeroom from material received and stock added in the entry. Material left
          is that storeroom minus material used. Similar descriptions share one cumulated line.
        </p>
      </header>

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 px-4 py-3 sm:px-5">
          <h2 className="text-base font-semibold text-zinc-900">Material on site</h2>
        </div>
        <MaterialRegisterTable
          columns={COLUMNS}
          lines={lines}
          emptyMessage="No material is in the storeroom yet."
        />
      </section>
    </div>
  )
}
