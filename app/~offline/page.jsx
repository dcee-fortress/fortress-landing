import Link from "next/link"
import { APP_BRAND } from "@/lib/appBrand"
import { RODCROFT_CHADCOMBE_PROJECT_ID } from "@/lib/projectList"

export const metadata = {
  title: `Offline · ${APP_BRAND}`,
  robots: { index: false, follow: false },
}

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-zinc-100 px-6 text-center">
      <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">{APP_BRAND}</p>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">You are offline</h1>
      <p className="max-w-md text-sm text-zinc-600">
        Open pages while online once so they are saved on this device. Valuations, BOQ, and rate
        build-up data already on this phone still work without signal.
      </p>
      <Link
        href={`/project/${RODCROFT_CHADCOMBE_PROJECT_ID}`}
        className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white"
      >
        Open {APP_BRAND}
      </Link>
    </main>
  )
}
