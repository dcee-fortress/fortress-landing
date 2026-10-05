"use client"

import { useEntrySuggestions } from "@/components/project/EntrySuggestionMenu"

export default function MemoryTextInput({
  value,
  onChange,
  suggest,
  multiline = false,
  suggestOnFocus = false,
  openBelow = false,
  ...inputProps
}) {
  const suggestions = useEntrySuggestions(suggest, onChange, { below: openBelow })
  const Field = multiline ? "textarea" : "input"

  return (
    <>
      <Field
        {...(multiline ? {} : { type: "text" })}
        {...inputProps}
        autoComplete="off"
        value={value ?? ""}
        onFocus={(event) => {
          if (suggestOnFocus) suggestions.update(event.currentTarget.value, event.currentTarget)
          inputProps.onFocus?.(event)
        }}
        onChange={(event) => {
          onChange(event.target.value)
          suggestions.update(event.target.value, event.currentTarget)
        }}
        onKeyDown={(event) => {
          suggestions.handleKeyDown(event)
        }}
        onBlur={suggestions.close}
      />
      {suggestions.menu}
    </>
  )
}
