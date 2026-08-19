import dynamic from "next/dynamic"
import GroveLanding from "@/components/project/GroveLanding"

const AppShell = dynamic(() => import("@/components/project/AppShell"), {
  loading: () => (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="fixed left-0 top-0 z-50 h-[4.25rem] w-full border-b border-zinc-200 bg-white shadow-sm" />
      <div className="flex h-[calc(100vh-4.25rem)] items-center justify-center">
        <GroveLanding />
      </div>
    </div>
  ),
})

export default function Home() {
  return (
    <AppShell>
      <div className="h-[calc(100vh-4.25rem)] overflow-hidden bg-zinc-50 text-zinc-900">
        <GroveLanding />
      </div>
    </AppShell>
  )
}
