"use client"

import Link from "next/link"
import Icon from "@/components/icon/icon"
import CeoFilesToggle from "@/components/project/CeoFilesToggle"
import ProjectPageClientShell from "@/components/project/ProjectPageClientShell"
import { useProjects } from "@/components/project/ProjectsProvider"
import { useHasHydrated } from "@/hooks/useHasHydrated"
import { getTodayDayId } from "@/lib/dailyFiles"
import { getInductionRegisterData } from "@/lib/inductionRegisterData"
import { getPlantOperatorRegisterData } from "@/lib/plantOperatorRegisterData"
import {
  getCeoDashboardsHref,
  getInductionRegistersHref,
  getPlantOperatorsHref,
  getSiteStaffRegistersHref,
} from "@/lib/projectRoutes"
import { getMonthRegisterMeta, getSiteStaffRegisterData } from "@/lib/siteStaffRegisterData"

const MONTHS_TO_LOOK_BACK = 24

function previousMonthId(monthId) {
  const [year, month] = monthId.split("-").map(Number)
  const previous = new Date(year, month - 2, 1)
  return `${previous.getFullYear()}-${String(previous.getMonth() + 1).padStart(2, "0")}`
}

/** Same full name = same person; a different surname makes it a different person. */
function normalizePersonName(name) {
  return String(name ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

function namesFromRows(rows, field) {
  return (rows ?? []).map((row) => normalizePersonName(row?.[field])).filter(Boolean)
}

function readMonthNames(projectId, monthId) {
  return {
    induction: namesFromRows(getInductionRegisterData(projectId, monthId).rows, "name"),
    admin: namesFromRows(getSiteStaffRegisterData(projectId, monthId).rows, "name"),
    operators: namesFromRows(getPlantOperatorRegisterData(projectId, monthId).rows, "operatorName"),
  }
}

function countUnique(...nameLists) {
  return new Set(nameLists.flat()).size
}

/** Head counts for this month, or the latest earlier month where any register has names. */
function getHeadCounts(projectId) {
  const currentMonthId = getTodayDayId().slice(0, 7)
  let monthId = currentMonthId
  let names = readMonthNames(projectId, monthId)

  for (let step = 1; step < MONTHS_TO_LOOK_BACK && countUnique(...Object.values(names)) === 0; step += 1) {
    monthId = previousMonthId(monthId)
    names = readMonthNames(projectId, monthId)
  }

  if (countUnique(...Object.values(names)) === 0) {
    monthId = currentMonthId
  }

  return {
    monthName: getMonthRegisterMeta(monthId).monthName,
    induction: countUnique(names.induction),
    admin: countUnique(names.admin),
    operators: countUnique(names.operators),
    workersOnSite: countUnique(names.induction, names.admin, names.operators),
  }
}

function getRegisterItems(projectId) {
  return [
    {
      key: "site-staff",
      href: getSiteStaffRegistersHref(projectId),
      icon: "users",
      title: "Site Staff attendance register",
      description: "Monthly attendance for site staff — name, role, and day boxes for present or absent",
    },
    {
      key: "induction",
      href: getInductionRegistersHref(projectId),
      icon: "file-text",
      title: "Induction register",
      description: "Monthly induction registers with name, ID number, phone number, position, and company name",
    },
    {
      key: "plant",
      href: getPlantOperatorsHref(projectId),
      icon: "hard-hat",
      title: "Plant register",
      description: "Register operators, assign plant, and manage operator records on site",
    },
  ]
}

function HeadCountCard({ label, count, detail }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-6 py-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-2 text-3xl font-bold tabular-nums text-zinc-900">{count ?? "—"}</p>
      <p className="mt-2 text-sm text-zinc-600">{detail ?? "Loading…"}</p>
    </div>
  )
}

function CeoWorkersView({ projectId, projectName }) {
  const hasHydrated = useHasHydrated()
  const { version } = useProjects()
  void version

  const headCounts = hasHydrated ? getHeadCounts(projectId) : null

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link
          href={getCeoDashboardsHref(projectId)}
          className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
        >
          <Icon name="arrow-left" size={16} />
          Back to CEO EXCLUSIVE
        </Link>
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">Total number of workers</p>
        <h1
          suppressHydrationWarning
          className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl lg:text-4xl"
        >
          {projectName || "Project"}
        </h1>
        <p className="max-w-2xl text-sm text-zinc-500 sm:text-base">
          People on site this month from the induction, site staff and operator registers. A name
          listed in more than one register is counted once.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <HeadCountCard
          label="Total workers on site"
          count={headCounts?.workersOnSite}
          detail={
            headCounts
              ? `${headCounts.induction} induction register + ${headCounts.admin} admin members + ${headCounts.operators} operator register · ${headCounts.monthName}`
              : null
          }
        />
        <HeadCountCard
          label="Total admin members"
          count={headCounts?.admin}
          detail={headCounts ? `Site Staff register · ${headCounts.monthName}` : null}
        />
      </div>

      <CeoFilesToggle
        icon="book-open"
        title="Registers"
        description="Open the site staff attendance, induction and plant registers"
        items={getRegisterItems(projectId)}
      />
    </div>
  )
}

export default function CeoWorkersPageClient({ projectId }) {
  return (
    <ProjectPageClientShell projectId={projectId}>
      {(project) => (
        <div className="app-page-frame text-zinc-900">
          <div className="app-content-shell">
            <CeoWorkersView projectId={projectId} projectName={project.name} />
          </div>
        </div>
      )}
    </ProjectPageClientShell>
  )
}
