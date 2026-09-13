"use client"

import TableCellInput from "@/components/project/TableCellInput"

export default function HoursFieldInput({
  value,
  onChange,
  placeholder = "0",
  className = "",
  id,
}) {
  return (
    <TableCellInput
      id={id}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      inputMode="decimal"
      align="right"
      className={`min-w-[96px] ${className}`}
    />
  )
}
