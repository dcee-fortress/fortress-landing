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
      <header className="fixed left-0 right-0 top-0 z-50 w-full border-b border-zinc-200 bg-white pt-[env(safe-area-inset-top)] shadow-sm">
        <div className="mx-auto flex h-14 w-full max-w-[90rem] items-center gap-2 px-3 sm:gap-3 sm:px-4 lg:h-16 lg:px-6">
          <div ref={menuRef} className="relative flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            <button
              type="button"
              aria-expanded={open}
              aria-haspopup="true"
              aria-label="Open projects menu"
              onClick={() => setOpen((current) => !current)}
              className="inline-flex h-10 w-10 shrink-0 touch-manipulation items-center justify-center rounded-lg border border-zinc-300 bg-white text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50 lg:h-11 lg:w-11"
            >
              <Icon name="align-justify" size={20} />
            </button>

            <Link href="/" prefetch={false} className="flex min-w-0 items-center gap-2 transition hover:opacity-80">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-sm font-bold tracking-wide text-white sm:h-9 sm:w-9 lg:h-10 lg:w-10 lg:text-base">
                F
              </span>
              <span className="truncate text-base font-bold tracking-[0.08em] text-zinc-900 sm:text-xl sm:tracking-[0.1em]">
                {APP_BRAND}
              </span>
            </Link>

            {open ? (
              <div className="absolute left-0 top-full z-50 mt-2 max-h-[min(24rem,70dvh)] w-[min(20rem,calc(100vw-1.5rem))] overflow-y-auto overscroll-contain rounded-xl border border-zinc-200 bg-white shadow-lg">
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
                          className={`flex min-h-12 w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm text-zinc-900 transition hover:bg-zinc-50 ${
                            isCurrent ? "bg-zinc-50" : ""
                          }`}
                        >
                          <span className="min-w-0 truncate font-medium">{project.name}</span>
                          {isCurrent ? (
                            <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                              Open
                            </span>
                          ) : (
                            <Icon name="chevron-right" size={16} className="shrink-0 text-zinc-400" />
                          )}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ) : null}
          </div>

          <button
            type="button"
            aria-label="Create new project"
            onClick={() => {
              setOpen(false)
              setShowCreate(true)
            }}
            className="inline-flex h-10 w-10 shrink-0 touch-manipulation items-center justify-center rounded-lg border border-zinc-300 bg-white text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50 lg:h-11 lg:w-auto lg:gap-2 lg:px-3"
          >
            <Icon name="plus" size={20} />
            <span className="hidden text-sm font-medium lg:inline">New project</span>
          </button>

          <Link
            href="/settings"
            prefetch={false}
            aria-label="Open settings"
            className="inline-flex h-10 w-10 shrink-0 touch-manipulation items-center justify-center rounded-lg border border-zinc-300 bg-zinc-100 text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-200 lg:h-11 lg:w-auto lg:gap-2 lg:px-3"
          >
            <Icon name="settings-2" size={20} />
            <span className="hidden text-sm font-medium lg:inline">Settings</span>
          </Link>
        </div>
      </header>

      <CreateProjectModal open={showCreate} onClose={() => setShowCreate(false)} />
    </>
  )
}
