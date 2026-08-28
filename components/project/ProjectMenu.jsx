"use client"

import { useEffect, useRef, useState } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { usePathname } from "next/navigation"
import Icon from "@/components/icon/icon"
import { useProjects } from "@/components/project/ProjectsProvider"
import { APP_BRAND } from "@/lib/appBrand"
import { getProjectHomeHref } from "@/lib/projectRoutes"

const CreateProjectModal = dynamic(() => import("@/components/project/CreateProjectModal"), {
  ssr: false,
})

export { APP_BRAND }

function getActiveProjectId(pathname) {
  const projectMatch = pathname.match(/^\/project\/([^/]+)/)
  if (projectMatch) return projectMatch[1]
  return null
}

export default function ProjectMenu() {
  const [open, setOpen] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const menuRef = useRef(null)
  const pathname = usePathname()
  const activeProjectId = getActiveProjectId(pathname)
  const { projects } = useProjects()
  const activeProjects = projects.filter((project) => project.status !== "ended")

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false)
      }
    }

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setOpen(false)
        setShowCreate(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleEscape)

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [])

  return (
    <>
      <header className="fixed left-0 top-0 z-50 w-full border-b border-zinc-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3">
          <div ref={menuRef} className="relative flex items-center gap-3">
            <div className="flex flex-col gap-1.5">
              <button
                type="button"
                aria-expanded={open}
                aria-haspopup="true"
                aria-label="Open projects menu"
                onClick={() => setOpen((current) => !current)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-300 bg-white text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50"
              >
                <Icon name="align-justify" size={20} />
              </button>

              <button
                type="button"
                aria-label="Create new project"
                onClick={() => {
                  setOpen(false)
                  setShowCreate(true)
                }}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-300 bg-white text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50"
              >
                <Icon name="plus" size={20} />
              </button>
            </div>

            <Link href="/" prefetch={false} className="flex items-center gap-2.5 transition hover:opacity-80">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-900 text-sm font-bold tracking-wide text-white">
                F
              </span>
              <span className="text-lg font-bold tracking-[0.08em] text-zinc-900 sm:text-xl sm:tracking-[0.1em]">
                {APP_BRAND}
              </span>
            </Link>

            {open ? (
              <div className="absolute left-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg">
                <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Projects
                  </p>
                  <p className="mt-0.5 text-sm text-zinc-600">Select a project to open dashboards</p>
                </div>

                <ul className="py-1">
                  {activeProjects.map((project) => {
                    const isCurrent = activeProjectId === project.id

                    return (
                      <li key={project.id}>
                        <Link
                          href={getProjectHomeHref(project.id)}
                          prefetch={false}
                          onClick={() => setOpen(false)}
                          className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm text-zinc-900 transition hover:bg-zinc-50 ${
                            isCurrent ? "bg-zinc-50" : ""
                          }`}
                        >
                          <span className="font-medium">{project.name}</span>
                          {isCurrent ? (
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                              Open
                            </span>
                          ) : (
                            <Icon name="chevron-right" size={16} className="text-zinc-400" />
                          )}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ) : null}
          </div>

          <Link
            href="/settings"
            prefetch={false}
            aria-label="Open settings"
            className="ml-auto inline-flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-300 bg-zinc-100 text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-200"
          >
            <Icon name="settings-2" size={20} />
          </Link>
        </div>
      </header>

      <CreateProjectModal open={showCreate} onClose={() => setShowCreate(false)} />
    </>
  )
}
