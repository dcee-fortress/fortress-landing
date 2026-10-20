"use client"

import { useMemo } from "react"
import Link from "next/link"
import Icon from "@/components/icon/icon"
import MaterialRegisterTable from "@/components/project/MaterialRegisterTable"
import { useHasHydrated } from "@/hooks/useHasHydrated"
import { useProjects } from "@/components/project/ProjectsProvider"
import { getMaterialRegister } from "@/lib/materialRegister"
import { getMaterialRegisterHref } from "@/lib/projectRoutes"

export default function MaterialRegisterRollupView({ projectId, projectName, kind }) {
  const register = getMaterialRegister(kind)
  const hasHydrated = useHasHydrated()
  const { version } = useProjects()
  void version

  const lines = useMemo(() => {
    if (!hasHydrated) return []
    return register.getDashboardLinesForDayIds(projectId, register.getDayIds(projectId))
  }, [hasHydrated, projectId, register, version])

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link
          href={getMaterialRegisterHref(projectId, kind)}
          className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
        >
          <Icon name="arrow-left" size={16} />
          Back to {register.title}
        </Link>
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Project to date {register.noun}
        </p>
        <h1
          suppressHydrationWarning
          className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl lg:text-4xl"
        >
          {projectName || "Project"}
        </h1>
        <p className="max-w-2xl text-sm text-zinc-500 sm:text-base">{register.rollupNote}</p>
      </header>

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 px-4 py-3 sm:px-5">
          <h2 className="text-base font-semibold text-zinc-900">{register.title} table</h2>
        </div>
        {!hasHydrated ? (
          <p className="px-6 py-8 text-sm text-zinc-500">Loading…</p>
        ) : (
          <MaterialRegisterTable
            columns={register.dashboardColumns}
            lines={lines}
            emptyMessage={`No ${register.noun} in project to date yet. Add entries on ${register.dailyTitle.toLowerCase()}.`}
          />
        )}
      </section>
    </div>
  )
}
