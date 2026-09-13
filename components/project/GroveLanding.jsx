"use client"

import { APP_BRAND } from "@/lib/appBrand"

export default function GroveLanding() {
  return (
    <div className="app-page-frame flex items-center justify-center text-zinc-900">
      <h1 className="brand-wordmark" aria-label={APP_BRAND} suppressHydrationWarning>
        {APP_BRAND}
      </h1>
    </div>
  )
}
