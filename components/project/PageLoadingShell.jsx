import { APP_BRAND } from "@/lib/appBrand"

export default function PageLoadingShell({ className = "" }) {
  return (
    <div
      className={`flex min-h-[calc(100dvh-var(--app-header-height,3.5rem))] items-center justify-center bg-zinc-50 ${className}`}
    >
      <p className="brand-wordmark brand-wordmark--pulse" aria-label={APP_BRAND}>
        {APP_BRAND}
      </p>
    </div>
  )
}
