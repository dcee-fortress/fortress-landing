"use client"

import { useEffect, useRef, useState } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import Icon from "@/components/icon/icon"
import RestrictedAreaLoginDialog from "@/components/project/RestrictedAreaLoginDialog"
import { useProjects } from "@/components/project/ProjectsProvider"
import { APP_BRAND } from "@/lib/appBrand"
import {
  CEO_DASHBOARD_REMEMBER_KEY,
  isCeoDashboardRemembered,
  unlockCeoDashboard,
  validateCeoDashboardCredentials,
} from "@/lib/ceoDashboardAuth"
import {
  RESTRICTED_AREA_REMEMBER_KEY,
  isRestrictedAreaRemembered,
  unlockRestrictedArea,
  validateRestrictedAreaCredentials,
} from "@/lib/restrictedAreaAuth"
import { recordSavedLoginAutoOpen } from "@/lib/savedLoginLimit"
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

const headerButtonClass =
  "inline-flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-xl border border-zinc-300 bg-white text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50 active:bg-zinc-100 lg:h-11 lg:w-auto lg:gap-2 lg:px-3"

export default function ProjectMenu() {
  const [open, setOpen] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [loginIntent, setLoginIntent] = useState(null)
  const menuRef = useRef(null)
  const pathname = usePathname()
  const router = useRouter()
  const activeProjectId = getActiveProjectId(pathname)
  const { menuProjects } = useProjects()
  const activeProjects = menuProjects

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!open) return undefined

    const handlePointerDown = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false)
      }
    }

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setOpen(false)
        setShowCreate(false)
        setLoginIntent(null)
      }
    }

    // pointerdown covers mouse + touch without swallowing the opening tap.
    document.addEventListener("pointerdown", handlePointerDown)
    document.addEventListener("keydown", handleEscape)

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [open])

  function requestRestrictedAction(intent) {
    setOpen(false)
    if (intent === "settings" && isCeoDashboardRemembered()) {
      recordSavedLoginAutoOpen(CEO_DASHBOARD_REMEMBER_KEY)
      router.push("/settings")
      return
    }
    if (intent === "create" && isRestrictedAreaRemembered()) {
      recordSavedLoginAutoOpen(RESTRICTED_AREA_REMEMBER_KEY)
      setShowCreate(true)
      return
    }
    setLoginIntent(intent)
  }

  function handleLoginUnlocked() {
    const intent = loginIntent
    setLoginIntent(null)
    if (intent === "create") setShowCreate(true)
    if (intent === "settings") router.push("/settings")
  }

  return (
    <>
      <header
        className="app-site-header fixed inset-x-0 top-0 z-[100] w-full border-b border-zinc-200 bg-white shadow-sm"
        suppressHydrationWarning
      >
        <div className="mx-auto flex min-h-14 w-full max-w-[90rem] items-center gap-2 px-3 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] sm:gap-3 sm:px-4 lg:min-h-16 lg:px-6 lg:pb-2.5">
          <div ref={menuRef} className="relative flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            <button
              type="button"
              aria-expanded={open}
              aria-haspopup="true"
              aria-label="Open projects menu"
              onClick={() => setOpen((current) => !current)}
              className={headerButtonClass}
            >
              <Icon name="align-justify" size={22} />
            </button>

            <Link
              href="/"
              prefetch={false}
              className="flex min-w-0 items-center gap-2 transition hover:opacity-80"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-sm font-bold tracking-wide text-white sm:h-9 sm:w-9 lg:h-10 lg:w-10 lg:text-base">
                F
              </span>
              <span className="app-brand-name hidden truncate min-[380px]:inline">
                {APP_BRAND}
              </span>
            </Link>

            {open ? (
              <div className="absolute left-0 top-[calc(100%+0.5rem)] z-[110] max-h-[min(24rem,calc(100dvh-6rem))] w-[min(20rem,calc(100vw-1.5rem))] overflow-y-auto overscroll-contain rounded-xl border border-zinc-200 bg-white shadow-lg">
                <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Projects
                  </p>
                  <p className="mt-0.5 text-sm text-zinc-600">Select a project to open dashboards</p>
                </div>

                <ul className="py-1">
                  {activeProjects.length === 0 ? (
                    <li className="px-4 py-3 text-sm text-zinc-500">
                      No active projects. Ended projects are in Settings.
                    </li>
                  ) : null}
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
            onClick={() => requestRestrictedAction("create")}
            className={headerButtonClass}
          >
            <Icon name="plus" size={22} />
            <span className="hidden text-sm font-medium lg:inline">New project</span>
          </button>

          <button
            type="button"
            aria-label="Open settings"
            onClick={() => requestRestrictedAction("settings")}
            className={`${headerButtonClass} bg-zinc-100 hover:bg-zinc-200`}
          >
            <Icon name="settings-2" size={22} />
            <span className="hidden text-sm font-medium lg:inline">Settings</span>
          </button>
        </div>
      </header>

      <RestrictedAreaLoginDialog
        open={Boolean(loginIntent)}
        title={loginIntent === "settings" ? "Settings" : "Create new project"}
        description={
          loginIntent === "settings"
            ? "Enter the Engineering username and password to open Settings."
            : "Enter the username and password to continue."
        }
        validateCredentials={
          loginIntent === "settings"
            ? validateCeoDashboardCredentials
            : validateRestrictedAreaCredentials
        }
        unlock={loginIntent === "settings" ? unlockCeoDashboard : unlockRestrictedArea}
        onCancel={() => setLoginIntent(null)}
        onUnlocked={handleLoginUnlocked}
      />

      {showCreate ? <CreateProjectModal open onClose={() => setShowCreate(false)} /> : null}
    </>
  )
}
