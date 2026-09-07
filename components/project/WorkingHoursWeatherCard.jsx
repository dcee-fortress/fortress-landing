"use client"

import { useEffect, useMemo, useState } from "react"
import Icon from "@/components/icon/icon"
import { formatWeekRange, getWeekDateRange } from "@/lib/progressReportGenerator"
import { summarizeWeekForecast, weatherTonePalette } from "@/lib/siteWeather"

function formatDayHeading(dayId, { weekday = "short", withYear = false } = {}) {
  if (!dayId) return ""
  const date = new Date(`${dayId}T00:00:00`)
  return date.toLocaleDateString("en-GB", {
    weekday,
    day: "numeric",
    month: "short",
    ...(withYear ? { year: "numeric" } : {}),
  })
}

function hourCaption(hour) {
  if (hour <= 8) return "Morning"
  if (hour <= 11) return "Late morning"
  if (hour <= 14) return "Afternoon"
  return "Dusk"
}

export default function WorkingHoursWeatherCard({
  projectName,
  reportType = "daily",
  reportId,
}) {
  const range = useMemo(() => {
    if (reportType === "weekly" && reportId) {
      const { startDate, endDate } = getWeekDateRange(reportId)
      const pad = (value) => String(value).padStart(2, "0")
      const toId = (date) =>
        `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
      return { start: toId(startDate), end: toId(endDate) }
    }

    return { start: reportId, end: reportId }
  }, [reportId, reportType])

  const [data, setData] = useState(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [selectedDayId, setSelectedDayId] = useState(range.start)

  useEffect(() => {
    let cancelled = false
    const params = new URLSearchParams({
      start: range.start,
      end: range.end,
      site: projectName || "",
    })

    setLoading(true)
    setError("")

    fetch(`/api/site-weather?${params.toString()}`)
      .then(async (response) => {
        const payload = await response.json()
        if (!response.ok) {
          throw new Error(payload?.error || "Weather forecast is unavailable.")
        }
        return payload
      })
      .then((payload) => {
        if (cancelled) return
        setData(payload)
        const now = new Date()
        const todayId = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
        const hasToday = payload.days?.some((day) => day.dayId === todayId)
        setSelectedDayId(hasToday ? todayId : payload.days?.[0]?.dayId || range.start)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : "Weather forecast is unavailable.")
        setData(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [projectName, range.end, range.start])

  const isWeekly = reportType === "weekly"
  const selectedDay = data?.days?.find((day) => day.dayId === selectedDayId) || data?.days?.[0]
  const weekSummary = useMemo(() => summarizeWeekForecast(data?.days || []), [data?.days])
  const headingCondition = isWeekly ? weekSummary?.condition : selectedDay?.condition
  const tone = weatherTonePalette(headingCondition?.tone)
  const locationName = data?.location?.name || projectName
  const weekRangeLabel = reportId && isWeekly ? formatWeekRange(reportId) : ""
  const high = isWeekly ? weekSummary?.high : selectedDay?.high
  const low = isWeekly ? weekSummary?.low : selectedDay?.low

  return (
    <section
      className="pdf-weather-card overflow-visible rounded-xl border"
      style={{
        backgroundColor: "#ffffff",
        borderColor: "#d4d4d8",
        color: tone.hourText,
      }}
    >
      <div
        className="flex flex-wrap items-start justify-between gap-4 px-4 py-4 md:px-5"
        style={{ backgroundColor: tone.bg, color: tone.text }}
      >
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: tone.muted }}>
            {isWeekly ? "Site weather · weekly forecast" : "Site weather · working hours"}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span
              className="inline-flex h-9 w-9 items-center justify-center rounded-full"
              style={{ backgroundColor: tone.chip, color: tone.text }}
            >
              <Icon name={headingCondition?.icon || "cloud-sun"} size={18} color={tone.text} />
            </span>
            <div>
              <h2 className="text-xl font-semibold tracking-tight" style={{ color: tone.text }}>
                {loading
                  ? "Loading forecast…"
                  : isWeekly
                    ? headingCondition?.label
                      ? `Week outlook · ${headingCondition.label}`
                      : "Weekly forecast"
                    : selectedDay?.condition?.label || "Forecast"}
              </h2>
              <p className="text-xs" style={{ color: tone.muted }}>
                {locationName}
                {data?.location?.country ? `, ${data.location.country}` : ""}
                {isWeekly
                  ? ` · ${weekRangeLabel} · working hours 07:00 – 17:00`
                  : ` · ${formatDayHeading(selectedDay?.dayId || reportId, { weekday: "long", withYear: true })} · ${selectedDay?.windowLabel || "07:00 – 17:00 · morning to dusk"}`}
              </p>
            </div>
          </div>
        </div>

        <div
          className="rounded-lg px-4 py-2 text-right"
          style={{ backgroundColor: tone.chip, color: tone.text }}
        >
          <p className="text-[11px] uppercase tracking-wide" style={{ color: tone.muted }}>
            {isWeekly ? "Week temperature" : "Shift temperature"}
          </p>
          <p className="text-2xl font-semibold tabular-nums" style={{ color: tone.text }}>
            {high != null ? `${high}°` : "—"}
            <span className="ml-1 text-sm font-medium" style={{ color: tone.muted }}>
              / {low != null ? `${low}°C` : "—"}
            </span>
          </p>
          <p className="text-xs" style={{ color: tone.muted }}>
            {isWeekly
              ? `Peak rain ${weekSummary?.peakRainChance ?? 0}%${
                  weekSummary?.wetDays
                    ? ` · ${weekSummary.wetDays} wet day${weekSummary.wetDays === 1 ? "" : "s"}`
                    : " · dry week"
                }`
              : `Rain chance ${selectedDay?.peakRainChance ?? 0}%${
                  selectedDay?.rainHours
                    ? ` · ${selectedDay.rainHours} wet hour${selectedDay.rainHours === 1 ? "" : "s"}`
                    : " · dry shift"
                }`}
          </p>
        </div>
      </div>

      <div className="space-y-3 p-4 md:p-5" style={{ backgroundColor: "#ffffff" }}>
        {isWeekly && data?.days?.length ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            {data.days.map((day) => {
              const active = day.dayId === selectedDay?.dayId
              return (
                <button
                  key={day.dayId}
                  type="button"
                  onClick={() => setSelectedDayId(day.dayId)}
                  className="rounded-lg px-2 py-3 text-center"
                  style={
                    active
                      ? { backgroundColor: tone.bg, color: tone.text }
                      : { backgroundColor: tone.hourBg, color: tone.hourText, border: "1px solid #d4d4d8" }
                  }
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: active ? tone.muted : "#71717a" }}>
                    {formatDayHeading(day.dayId)}
                  </p>
                  <div
                    className="mx-auto mt-2 flex h-8 w-8 items-center justify-center rounded-full"
                    style={{ backgroundColor: active ? tone.chip : "#ffffff" }}
                  >
                    <Icon name={day.condition?.icon || "cloud-sun"} size={16} color={active ? tone.text : tone.hourText} />
                  </div>
                  <p className="mt-2 text-sm font-semibold leading-tight">{day.condition?.label || "Forecast"}</p>
                  <p className="mt-1 text-sm font-semibold tabular-nums">
                    {day.high != null ? `${day.high}°` : "—"}
                    <span className="ml-1 text-xs font-medium" style={{ color: active ? tone.muted : "#71717a" }}>
                      / {day.low != null ? `${day.low}°` : "—"}
                    </span>
                  </p>
                  <p className="mt-1 text-[10px]" style={{ color: active ? tone.muted : "#71717a" }}>
                    {day.peakRainChance ?? 0}% rain
                  </p>
                </button>
              )
            })}
          </div>
        ) : null}

        {error ? (
          <p className="rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: "#fef2f2", color: "#9f1239", border: "1px solid #fecdd3" }}>
            {error}
          </p>
        ) : null}

        {loading ? (
          <div className={isWeekly ? "grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7" : "grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8"}>
            {Array.from({ length: isWeekly ? 7 : 8 }).map((_, index) => (
              <div
                key={index}
                className="h-24 rounded-lg"
                style={{ backgroundColor: "#f4f4f5", border: "1px solid #e4e4e7" }}
              />
            ))}
          </div>
        ) : isWeekly ? null : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
            {(selectedDay?.hours || []).map((hour, index) => (
              <div
                key={`${hour.time}-${index}`}
                className="rounded-lg px-3 py-3 text-center"
                style={{
                  backgroundColor: tone.hourBg,
                  color: tone.hourText,
                  border: "1px solid #d4d4d8",
                }}
              >
                <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#71717a" }}>
                  {hourCaption(hour.hour)}
                </p>
                <p className="mt-0.5 text-xs font-medium">{hour.time}</p>
                <div
                  className="mx-auto mt-2 flex h-8 w-8 items-center justify-center rounded-full"
                  style={{ backgroundColor: "#ffffff", border: `1px solid ${tone.accent}` }}
                >
                  <Icon name={hour.icon} size={16} color={tone.hourText} />
                </div>
                <p className="mt-2 text-lg font-semibold tabular-nums">
                  {hour.temperature != null ? `${Math.round(hour.temperature)}°` : "—"}
                </p>
                <p className="text-[11px] leading-tight" style={{ color: "#52525b" }}>{hour.label}</p>
                {hour.rainChance != null ? (
                  <p className="mt-1 text-[10px]" style={{ color: "#71717a" }}>{Math.round(hour.rainChance)}% rain</p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
