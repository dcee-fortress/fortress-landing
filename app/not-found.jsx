import Link from "next/link"
import { APP_BRAND } from "@/lib/appBrand"

export default function NotFound() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-zinc-50 px-6 text-zinc-900">
      <div className="max-w-md space-y-4 text-center">
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">{APP_BRAND}</p>
        <h1 className="text-2xl font-semibold tracking-tight">This page is not available</h1>
        <p className="text-sm text-zinc-500">
          The project or file may have been removed, or the link is out of date.
        </p>
        <Link
          href="/"
          className="inline-flex rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
        >
          Back to projects
        </Link>
      </div>
    </div>
  )
}
