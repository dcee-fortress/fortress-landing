import { APP_BRAND } from "@/lib/appBrand"

export default function GroveLanding() {
  return (
    <div className="flex min-h-[calc(100vh-4.25rem)] items-center justify-center bg-zinc-50 px-6">
      <h1 className="select-none text-center text-4xl font-light tracking-[0.2em] text-zinc-900 sm:text-5xl md:text-6xl lg:text-7xl">
        {APP_BRAND}
      </h1>
    </div>
  )
}
