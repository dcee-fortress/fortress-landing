import Icon from "@/components/icon/icon"
import Link from "next/link"

export default function ChoiceCard({
  href,
  onClick,
  icon,
  title,
  description,
  iconClassName = "app-icon-tile--neutral",
  className = "",
  hoverText = "",
  prefetch = true,
}) {
  const content = (
    <>
      <div className={`app-icon-tile ${iconClassName}`}>
        <Icon name={icon} size={22} />
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <h2 className="text-base font-semibold text-zinc-900 lg:text-lg">{title}</h2>
        {description ? (
          <p className="text-sm leading-relaxed text-zinc-500">{description}</p>
        ) : null}
      </div>
      {hoverText ? (
        <span className="app-choice-card__hover-text" aria-hidden="true">
          <span className="app-silver-text">{hoverText}</span>
        </span>
      ) : null}
    </>
  )

  if (typeof onClick === "function") {
    return (
      <button type="button" onClick={onClick} className={`app-choice-card text-left ${className}`.trim()}>
        {content}
      </button>
    )
  }

  return (
    <Link href={href} prefetch={prefetch} className={`app-choice-card ${className}`.trim()}>
      {content}
    </Link>
  )
}
