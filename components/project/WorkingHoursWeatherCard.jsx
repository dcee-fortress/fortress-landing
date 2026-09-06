"use client"

import { useEffect, useMemo, useState } from "react"
import Icon from "@/components/icon/icon"
import { formatWeekRange, getWeekDateRange } from "@/lib/progressReportGenerator"
import { summarizeWeekForecast, weatherToneClasses } from "@/lib/siteWeather"

function formatDayHeading(dayId) {
  if (!dayId) return ""
  const date = new Date(`${dayId}T00:00:00`)
  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
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
  const tone = weatherToneClasses(headingCondition?.tone)
  const locationName = data?.location?.name || projectName
  const weekRangeLabel = reportId && isWeekly ? formatWeekRange(reportId) : ""

  return (
    <section
      className={`site-weather-card overflow-hidden rounded-2xl border border-white/40 bg-gradient-to-br ${tone.card} p-4 text-white shadow-lg shadow-slate-900/10 md:p-5`}
    >
      <style>{`
        .site-weather-card {
          position: relative;
        }
        .site-weather-card::before {
          content: "";
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 18% 20%, rgba(255,255,255,0.28), transparent 42%),
            radial-gradient(circle at 88% 0%, rgba(255,255,255,0.16), transparent 36%);
          pointer-events: none;
        }
        .site-weather-hours {
          scrollbar-width: thin;
        }
        .site-weather-hour {
          animation: weatherRise 420ms ease-out both;
        }
        @keyframes weatherRise {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="relative z-10 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80">
              {isWeekly ? "Site weather · weekly forecast" : "Site weather · working hours"}
            </p>
            <div className="mt-1 flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/20 ring-1 ring-white/30 backdrop-blur-sm">
                <Icon name={headingCondition?.icon || "cloud-sun"} size={18} />
              </span>
              <div>
                <h2 className="text-xl font-semibold tracking-tight">
                  {loading
                    ? "Loading forecast…"
                    : isWeekly
                      ? headingCondition?.label
                        ? `Week outlook · ${headingCondition.label}`
                        : "Weekly forecast"
                      : selectedDay?.condition?.label || "Forecast"}
                </h2>
                <p className="text-xs text-white/80">
                  {locationName}
                  {data?.location?.country ? `, ${data.location.country}` : ""}
                  {isWeekly
                    ? ` · ${weekRangeLabel} · working hours 07:00 – 17:00`
                    : ` · ${selectedDay?.windowLabel || "07:00 – 17:00 · morning to dusk"}`}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-white/15 px-4 py-2 text-right ring-1 ring-white/20 backdrop-blur-md">
            <p className="text-[11px] uppercase tracking-wide text-white/75">
              {isWeekly ? "Week temperature" : "Shift temperature"}
            </p>
            <p className="text-2xl font-semibold tabular-nums">
              {(isWeekly ? weekSummary?.high : selectedDay?.high) != null
                ? `${isWeekly ? weekSummary.high : selectedDay.high}°`
                : "—"}
              <span className="ml-1 text-sm font-medium text-white/80">
                / {(isWeekly ? weekSummary?.low : selectedDay?.low) != null
                  ? `${isWeekly ? weekSummary.low : selectedDay.low}°C`
                  : "—"}
              </span>
            </p>
            <p className="text-xs text-white/80">
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

        {isWeekly && data?.days?.length ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            {data.days.map((day) => {
              const active = day.dayId === selectedDay?.dayId
              return (
                <button
                  key={day.dayId}
                  type="button"
                  onClick={() => setSelectedDayId(day.dayId)}
                  className={`rounded-xl px-2 py-3 text-center ring-1 transition ${
                    active ? "bg-white text-slate-900 shadow-md ring-white" : "bg-white/15 text-white ring-white/20 hover:bg-white/25"
                  }`}
                >
                  <p className={`text-[10px] font-semibold uppercase tracking-wide ${active ? "text-slate-500" : "text-white/75"}`}>
                    {formatDayHeading(day.dayId)}
                  </p>
                  <div className={`mx-auto mt-2 flex h-8 w-8 items-center justify-center rounded-full ${active ? "bg-slate-100" : "bg-white/20"}`}>
                    <Icon name={day.condition?.icon || "cloud-sun"} size={16} />
                  </div>
                  <p className="mt-2 text-sm font-semibold leading-tight">{day.condition?.label || "Forecast"}</p>
                  <p className="mt-1 text-sm font-semibold tabular-nums">
                    {day.high != null ? `${day.high}°` : "—"}
                    <span className={`ml-1 text-xs font-medium ${active ? "text-slate-500" : "text-white/75"}`}>
                      / {day.low != null ? `${day.low}°` : "—"}
                    </span>
                  </p>
                  <p className={`mt-1 text-[10px] ${active ? "text-slate-500" : "text-white/75"}`}>
                    {day.peakRainChance ?? 0}% rain
                  </p>
                </button>
              )
            })}
          </div>
        ) : null}

        {error ? (
          <p className="rounded-xl bg-black/20 px-3 py-2 text-sm text-white/90 ring-1 ring-white/15">
            {error}
          </p>
        ) : null}

        {loading ? (
          <div className={isWeekly ? "grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7" : "grid grid-cols-4 gap-2 md:grid-cols-8"}>
            {Array.from({ length: isWeekly ? 7 : 8 }).map((_, index) => (
              <div
                key={index}
                className="h-24 animate-pulse rounded-xl bg-white/15"
              />
            ))}
          </div>
        ) : isWeekly ? null : (
          <div className="site-weather-hours -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {(selectedDay?.hours || []).map((hour, index) => (
              <div
                key={`${hour.time}-${index}`}
                className="site-weather-hour min-w-[5.6rem] flex-1 rounded-xl bg-white/15 px-3 py-3 text-center ring-1 ring-white/20 backdrop-blur-sm"
                style={{ animationDelay: `${index * 40}ms` }}
              >
                <p className="text-[10px] font-semibold uppercase tracking-wide text-white/75">
                  {hourCaption(hour.hour)}
                </p>
                <p className="mt-0.5 text-xs font-medium">{hour.time}</p>
                <div className="mx-auto mt-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                  <Icon name={hour.icon} size={16} />
                </div>
                <p className="mt-2 text-lg font-semibold tabular-nums">
                  {hour.temperature != null ? `${Math.round(hour.temperature)}°` : "—"}
                </p>
                <p className="text-[11px] leading-tight text-white/85">{hour.label}</p>
                {hour.rainChance != null ? (
                  <p className="mt-1 text-[10px] text-white/75">{Math.round(hour.rainChance)}% rain</p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
