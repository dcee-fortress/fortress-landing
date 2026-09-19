"use client"

import Icon from "@/components/icon/icon"
import Link from "next/link"
import { getFinanceHref } from "@/lib/projectRoutes"

export default function FinanceModulePlaceholderView({
  projectId,
  projectName,
  title,
  description,
}) {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link
          href={getFinanceHref(projectId)}
          className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
        >
          <Icon name="arrow-left" size={16} />
          Back to Finance
        </Link>
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">{title}</p>
        <h1
          suppressHydrationWarning
          className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl lg:text-4xl"
        >
          {projectName}
        </h1>
        <p className="max-w-2xl text-sm text-zinc-500 sm:text-base">{description}</p>
      </header>

      <div className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-12 text-center shadow-sm">
        <p className="text-base font-semibold text-zinc-900">Awaiting entry</p>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-zinc-500">
          {title} tools for this project will be added here next.
        </p>
      </div>
    </div>
  )
}
