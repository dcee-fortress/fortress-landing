"use client"

export default function HoursFieldInput({
  value,
  onChange,
  placeholder = "0",
  className = "",
  id,
}) {
  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={value ?? ""}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      aria-label={placeholder}
      className={`w-full min-w-[96px] rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 text-right tabular-nums ${className}`}
    />
  )
}