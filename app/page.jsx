import dynamic from "next/dynamic"
import GroveLanding from "@/components/project/GroveLanding"

const AppShell = dynamic(() => import("@/components/project/AppShell"), {
  loading: () => (
    <div className="min-h-dvh bg-zinc-50 text-zinc-900">
      <div className="fixed left-0 right-0 top-0 z-50 h-[var(--app-header-height)] border-b border-zinc-200 bg-white shadow-sm" />
      <div className="flex min-h-dvh items-center justify-center pt-[var(--app-header-height)]">
        <p className="text-2xl font-light tracking-[0.2em] text-zinc-400">Rodcroft</p>
      </div>
    </div>
  ),
})

export default function Home() {
  return (
    <AppShell>
      <GroveLanding />
    </AppShell>
  )
}
