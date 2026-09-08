import Icon from "@/components/icon/icon"
import Link from "next/link"

export default function ChoiceCard({
  href,
  icon,
  title,
  description,
  iconClassName = "app-icon-tile--neutral",
}) {
  return (
    <Link href={href} prefetch={false} className="app-choice-card">
      <div className={`app-icon-tile ${iconClassName}`}>
        <Icon name={icon} size={22} />
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <h2 className="text-base font-semibold text-zinc-900 lg:text-lg">{title}</h2>
        <p className="text-sm leading-relaxed text-zinc-500">{description}</p>
      </div>
    </Link>
  )
}
