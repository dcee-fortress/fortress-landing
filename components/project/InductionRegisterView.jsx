"use client"

import Link from "next/link"
import Icon from "@/components/icon/icon"
import ExportPdfButton from "@/components/project/ExportPdfButton"
import InductionRegisterTable from "@/components/project/InductionRegisterTable"
import { getMonthRegisterMeta } from "@/lib/siteStaffRegisterData"
import {
  formatInductionRegisterLabel,
  getInductionRegistersHref,
} from "@/lib/inductionRegisters"
import { isMonthlyFileInProgress } from "@/lib/periodFiles"

export default function InductionRegisterView({ projectName, projectId, file }) {
  const inProgress = isMonthlyFileInProgress(file)
  const { monthName } = getMonthRegisterMeta(file.id)

  function exportToPdf() {
    void import("@/lib/safetyReportPdf").then(({ exportInductionRegisterPdf }) => {
      exportInductionRegisterPdf({
        projectId,
        projectName,
        monthId: file.id,
        monthLabel: formatInductionRegisterLabel(file),
      })
    })
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link
          href={getInductionRegistersHref(projectId)}
          className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
        >
          <Icon name="arrow-left" size={16} />
          Back to monthly induction files
        </Link>
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
              Monthly Induction Register
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
              {formatInductionRegisterLabel(file)}
            </h1>
            <p className="text-zinc-500">{projectName}</p>
          </div>
          <ExportPdfButton onClick={exportToPdf} />
        </header>
      </div>

      <article className="min-w-0 rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-200 bg-zinc-50 px-6 py-4">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Induction register
            </h2>
            <p className="mt-1 text-sm text-zinc-600">
              {monthName} — record Name, ID Number, Phone number, Position, and Company name.
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

        <div className="min-w-0 px-3 py-6 sm:px-6">
          <InductionRegisterTable projectId={projectId} monthId={file.id} />
        </div>
      </article>
    </div>
  )
}
