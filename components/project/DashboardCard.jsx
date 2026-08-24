import Icon from "@/components/icon/icon"

export default function DashboardCard({
  title,
  value,
  subtitle,
  icon,
  tone = "default",
}) {
  const tones = {
    default: "border-zinc-200 bg-white",
    blue: "border-blue-100 bg-blue-50/50",
    green: "border-emerald-100 bg-emerald-50/50",
    amber: "border-amber-100 bg-amber-50/50",
    red: "border-red-100 bg-red-50/50",
  }

  const iconTones = {
    default: "bg-zinc-100 text-zinc-600",
    blue: "bg-blue-100 text-blue-600",
    green: "bg-emerald-100 text-emerald-600",
    amber: "bg-amber-100 text-amber-600",
    red: "bg-red-100 text-red-600",
  }

  return (
    <article className={`rounded-xl border p-5 shadow-sm ${tones[tone] ?? tones.default}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <p className="text-sm font-medium text-zinc-500">{title}</p>
          <p className="text-2xl font-semibold tracking-tight text-zinc-900">{value}</p>
          {subtitle && <p className="text-xs text-zinc-500">{subtitle}</p>}
        </div>
        {icon && (
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconTones[tone] ?? iconTones.default}`}>
            <Icon name={icon} size={20} />
          </div>
        )}
      </div>
    </article>
  )
}
