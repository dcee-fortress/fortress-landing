"use client"

import Link from "next/link"
import Icon from "@/components/icon/icon"
import PlantOperatorRegisterTable from "@/components/project/PlantOperatorRegisterTable"
import { getMonthRegisterMeta } from "@/lib/plantOperatorRegisterData"
import {
  formatPlantOperatorRegisterLabel,
  getPlantOperatorsHref,
} from "@/lib/plantOperatorRegisters"
import { isMonthlyFileInProgress } from "@/lib/periodFiles"

export default function PlantOperatorRegisterView({ projectName, projectId, file }) {
  const inProgress = isMonthlyFileInProgress(file)
  const { monthName, daysInMonth } = getMonthRegisterMeta(file.id)

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link
          href={getPlantOperatorsHref(projectId)}
          className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
        >
          <Icon name="arrow-left" size={16} />
          Back to monthly register files
        </Link>
        <header className="space-y-1">
          <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
            Monthly Plant Operator Register
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
            {formatPlantOperatorRegisterLabel(file)}
          </h1>
          <p className="text-zinc-500">{projectName}</p>
        </header>
      </div>

      <article className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-200 bg-zinc-50 px-6 py-4">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Operator Register Report
            </h2>
            <p className="mt-1 text-sm text-zinc-600">
              {monthName} attendance register with {daysInMonth} daily boxes. Record supplier, plant,
              plant number, and operator name, then mark each day with a tick or cross.
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ${
              inProgress
                ? "bg-amber-50 text-amber-800 ring-amber-200"
                : "bg-emerald-50 text-emerald-700 ring-emerald-200"
            }`}
          >
            {inProgress ? "In progress" : "Completed"}
          </span>
        </div>

        <div className="px-4 py-6 sm:px-6">
          <PlantOperatorRegisterTable projectId={projectId} monthId={file.id} />
        </div>
      </article>
    </div>
  )
}
