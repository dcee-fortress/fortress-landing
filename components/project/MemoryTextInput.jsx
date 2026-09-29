"use client"

import { useEntrySuggestions } from "@/components/project/EntrySuggestionMenu"

export default function MemoryTextInput({ value, onChange, suggest, multiline = false, ...inputProps }) {
  const suggestions = useEntrySuggestions(suggest, onChange)
  const Field = multiline ? "textarea" : "input"

  return (
    <>
      <Field
        {...(multiline ? {} : { type: "text" })}
        {...inputProps}
        autoComplete="off"
        value={value ?? ""}
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
