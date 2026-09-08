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

function weatherIcon(name, size, color) {
  return <Icon name={name || "cloud-sun"} size={size} color={color} />
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
  const conditionLabel = loading
    ? "Loading forecast"
    : headingCondition?.label || "Forecast"
  const placeLine = [
    locationName,
    data?.location?.country,
    isWeekly ? weekRangeLabel : formatDayHeading(selectedDay?.dayId || reportId, { weekday: "long", withYear: true }),
    "07:00 – 17:00",
  ]
    .filter(Boolean)
    .join(" · ")

  return (
    <section
      className="pdf-weather-card overflow-hidden rounded-2xl"
      style={{ backgroundColor: tone.bg, color: tone.text }}
    >
      <div className="flex flex-wrap items-end justify-between gap-4 px-5 py-5">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: tone.muted }}>
            {isWeekly ? "Weekly site weather" : "Today's site weather"}
          </p>
          <div className="mt-2 flex items-center gap-3">
            <span
              className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: "rgba(255,255,255,0.16)" }}
            >
              {weatherIcon(headingCondition?.icon, 26, "#ffffff")}
            </span>
            <div className="min-w-0">
              <h2 className="text-2xl font-semibold tracking-tight text-white">
                {conditionLabel}
              </h2>
              <p className="mt-0.5 truncate text-sm" style={{ color: tone.muted }}>
                {placeLine}
              </p>
            </div>
          </div>
        </div>

        <div className="text-right">
          <p className="text-4xl font-semibold tabular-nums leading-none text-white">
            {high != null ? `${high}°` : "—"}
          </p>
          <p className="mt-1 text-sm" style={{ color: tone.muted }}>
            Low {low != null ? `${low}°C` : "—"}
            {" · "}
            {isWeekly
              ? `${weekSummary?.peakRainChance ?? 0}% rain`
              : `${selectedDay?.peakRainChance ?? 0}% rain`}
          </p>
        </div>
      </div>

      <div className="px-4 pb-4">
        {error ? (
          <p className="mb-3 rounded-xl bg-white px-3 py-2 text-sm" style={{ color: "#9f1239" }}>
            {error}
          </p>
        ) : null}

        {loading ? (
          <div className={isWeekly ? "grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7" : "grid grid-cols-4 gap-2 md:grid-cols-8"}>
            {Array.from({ length: isWeekly ? 7 : 8 }).map((_, index) => (
              <div key={index} className="h-[7.5rem] rounded-xl" style={{ backgroundColor: "rgba(255,255,255,0.18)" }} />
            ))}
          </div>
        ) : isWeekly ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            {data?.days?.map((day) => {
              const active = day.dayId === selectedDay?.dayId
              return (
                <button
                  key={day.dayId}
                  type="button"
                  onClick={() => setSelectedDayId(day.dayId)}
                  className="rounded-xl px-2 py-3 text-center"
                  style={
                    active
                      ? { backgroundColor: "#ffffff", color: tone.hourText }
                      : { backgroundColor: "rgba(255,255,255,0.16)", color: "#ffffff" }
                  }
                >
                  <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: active ? "#64748b" : tone.muted }}>
                    {formatDayHeading(day.dayId)}
                  </p>
                  <div className="mx-auto mt-2 flex h-9 items-center justify-center">
                    {weatherIcon(day.condition?.icon, 22, active ? tone.hourText : "#ffffff")}
                  </div>
                  <p className="mt-2 text-lg font-semibold tabular-nums">
                    {day.high != null ? `${day.high}°` : "—"}
                  </p>
                  <p className="text-xs" style={{ color: active ? "#64748b" : tone.muted }}>
                    {day.condition?.label || "Forecast"}
                  </p>
                </button>
              )
            })}
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2 md:grid-cols-8">
            {(selectedDay?.hours || []).map((hour, index) => (
              <div
                key={`${hour.time}-${index}`}
                className="rounded-xl px-2 py-3 text-center"
                style={{ backgroundColor: "rgba(255,255,255,0.16)", color: "#ffffff" }}
              >
                <p className="text-xs font-semibold tabular-nums" style={{ color: tone.muted }}>
                  {hour.time}
                </p>
                <div className="mx-auto mt-2 flex h-9 items-center justify-center">
                  {weatherIcon(hour.icon, 22, "#ffffff")}
                </div>
                <p className="mt-2 text-lg font-semibold tabular-nums">
                  {hour.temperature != null ? `${Math.round(hour.temperature)}°` : "—"}
                </p>
                <p className="text-[11px] leading-tight" style={{ color: tone.muted }}>
                  {hour.label}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
