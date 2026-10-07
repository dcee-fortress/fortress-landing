"use client"

import { useState } from "react"
import Link from "next/link"
import Icon from "@/components/icon/icon"

/** A compact gold button that reveals links to period file pages when clicked. */
export default function CeoFilesToggle({ icon, title, description, items }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        title={description}
        className="ceo-toggle-button"
      >
        <Icon name={icon} size={16} className="inline-flex text-amber-300" />
        <span>{title}</span>
        <Icon
          name="chevron-right"
          size={14}
          className={`inline-flex text-amber-300/80 transition-transform ${open ? "rotate-90" : ""}`}
        />
      </button>

      {open ? (
        <div className="flex flex-wrap gap-2">
          {items.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              prefetch={false}
              title={item.description}
              className="ceo-file-chip"
            >
              <span className="ceo-file-chip__icon">
                <Icon name={item.icon} size={14} className="inline-flex" />
              </span>
              <span>{item.title}</span>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  )
}
