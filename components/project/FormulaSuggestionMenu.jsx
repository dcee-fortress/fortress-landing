"use client"

export default function FormulaSuggestionMenu({
  suggestions,
  activeIndex,
  onHover,
  onSelect,
  onDismiss,
}) {
  if (!suggestions?.length) return null

  return (
    <div className="absolute left-0 right-0 top-full z-50 mt-1 min-w-[14rem] overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg">
      <div className="flex items-center justify-between border-b border-zinc-100 px-2 py-1">
        <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
          Saved formulas
        </p>
        <button
          type="button"
          aria-label="Close formula suggestions"
          onMouseDown={(event) => {
            event.preventDefault()
            onDismiss()
          }}
          className="rounded px-1.5 text-xs font-semibold text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
        >
          X
        </button>
      </div>
      <ul className="max-h-48 overflow-auto py-1" role="listbox">
        {suggestions.map((item, index) => (
          <li key={item.formula} role="option" aria-selected={index === activeIndex}>
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => onHover(index)}
              onClick={() => onSelect(item.formula)}
              className={`block w-full px-3 py-2 text-left ${
                index === activeIndex ? "bg-blue-50 text-blue-900" : "text-zinc-800 hover:bg-zinc-50"
              }`}
            >
              <span className="block font-mono text-sm">{item.formula}</span>
              {item.description || item.columnLabel ? (
                <span className="mt-0.5 block text-[11px] text-zinc-500">
                  {[item.description, item.columnLabel].filter(Boolean).join(" · ")}
                </span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
      <p className="border-t border-zinc-100 px-3 py-1.5 text-[11px] text-zinc-500">
        Tab to use the highlighted formula, X to close, or keep typing.
      </p>
    </div>
  )
}
