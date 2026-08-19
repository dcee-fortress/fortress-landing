"use client"



import Icon from "@/components/icon/icon"

import Link from "next/link"

import { useProjects } from "@/components/project/ProjectsProvider"

import { DASHBOARD_VIEWS, getDashboardHref } from "@/lib/projectRoutes"

const HOME_MENU_VIEWS = ["valuations", "plant-on-site", "progress-reports", "rate-analysis"]



export default function HomeMenu({ projectId }) {

  const { getProject } = useProjects()

  const project = getProject(projectId)



  if (!project) {

    return null

  }



  return (

    <div className="mx-auto flex h-full max-w-3xl flex-col justify-center gap-8 p-6">

      <header className="space-y-2 text-center">

        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">

          {project.name}

        </p>

        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">Select a Dashboard</h1>

        <p className="text-zinc-500">Choose a report to view for the {project.name} project</p>

      </header>



      <div className="grid gap-4 sm:grid-cols-2">

        {HOME_MENU_VIEWS.map((view) => {
          const item = DASHBOARD_VIEWS[view]
          if (!item) return null

          return (
            <Link
              key={view}
              href={getDashboardHref(projectId, view)}
              prefetch={false}
              className="group flex items-start gap-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 hover:shadow-md"
            >

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-zinc-100 transition group-hover:bg-zinc-200">

                <Icon name={item.icon} size={22} className="text-zinc-700" />

              </div>

              <div className="space-y-1">

                <h2 className="font-semibold text-zinc-900">{item.label}</h2>

                <p className="text-sm leading-relaxed text-zinc-500">{item.description}</p>

              </div>

            </Link>
          )
        })}
      </div>

    </div>

  )

}

