export const SITE_WEATHER_START_HOUR = 7
export const SITE_WEATHER_END_HOUR = 17
export const SITE_WEATHER_TIMEZONE = "Africa/Harare"
export const SITE_WEATHER_FALLBACK = {
  name: "Harare",
  country: "Zimbabwe",
  latitude: -17.8252,
  longitude: 31.0335,
}

export function isWorkingHour(hour) {
  return hour >= SITE_WEATHER_START_HOUR && hour <= SITE_WEATHER_END_HOUR
}

export function describeWmoWeather(code) {
  const value = Number(code)

  if (value === 0) {
    return { label: "Sunny", summary: "Clear skies", icon: "sun", tone: "sunny" }
  }
  if (value === 1) {
    return { label: "Mostly sunny", summary: "Mainly clear", icon: "sun-medium", tone: "sunny" }
  }
  if (value === 2) {
    return { label: "Partly cloudy", summary: "Sun and cloud", icon: "cloud-sun", tone: "partly" }
  }
  if (value === 3) {
    return { label: "Cloudy", summary: "Overcast", icon: "cloud", tone: "cloudy" }
  }
  if (value === 45 || value === 48) {
    return { label: "Foggy", summary: "Reduced visibility", icon: "cloud-fog", tone: "fog" }
  }
  if (value >= 51 && value <= 57) {
    return { label: "Drizzle", summary: "Light rain", icon: "cloud-drizzle", tone: "rain" }
  }
  if (value >= 61 && value <= 67) {
    return { label: "Rainy", summary: "Rain during shift", icon: "cloud-rain", tone: "rain" }
  }
  if (value >= 71 && value <= 77) {
    return { label: "Snow", summary: "Cold and snowy", icon: "cloud-snow", tone: "snow" }
  }
  if (value >= 80 && value <= 82) {
    return { label: "Showers", summary: "Rain showers", icon: "cloud-sun-rain", tone: "rain" }
  }
  if (value >= 85 && value <= 86) {
    return { label: "Snow showers", summary: "Snow showers", icon: "cloud-snow", tone: "snow" }
  }
  if (value >= 95) {
    return { label: "Stormy", summary: "Thunderstorms", icon: "cloud-lightning", tone: "storm" }
  }

  return { label: "Cloudy", summary: "Mixed conditions", icon: "cloudy", tone: "cloudy" }
}

function hourFromTimestamp(value) {
  const time = String(value).slice(11, 13)
  return Number(time)
}

function pickDominantCondition(hours) {
  const rainy = hours.filter((hour) => hour.tone === "rain" || hour.tone === "storm")
  if (rainy.length >= Math.max(2, Math.ceil(hours.length / 4))) {
    return rainy.sort((a, b) => (b.precipitation ?? 0) - (a.precipitation ?? 0))[0]
  }

  const counts = new Map()
  for (const hour of hours) {
    counts.set(hour.label, (counts.get(hour.label) ?? 0) + 1)
  }

  let winner = hours[0]
  let best = 0
  for (const hour of hours) {
    const count = counts.get(hour.label) ?? 0
    if (count > best) {
      winner = hour
      best = count
    }
  }

  return winner
}

export function buildWorkingHoursForecast(payload) {
  const times = payload?.hourly?.time ?? []
  const temperatures = payload?.hourly?.temperature_2m ?? []
  const codes = payload?.hourly?.weather_code ?? payload?.hourly?.weathercode ?? []
  const precipitation = payload?.hourly?.precipitation ?? []
  const rainChance = payload?.hourly?.precipitation_probability ?? []
  const cloudCover = payload?.hourly?.cloud_cover ?? payload?.hourly?.cloudcover ?? []
  const wind = payload?.hourly?.wind_speed_10m ?? []

  const byDay = new Map()

  times.forEach((stamp, index) => {
    const hour = hourFromTimestamp(stamp)
    if (!isWorkingHour(hour)) return

    const dayId = String(stamp).slice(0, 10)
    const weather = describeWmoWeather(codes[index])
    const slot = {
      time: `${String(hour).padStart(2, "0")}:00`,
      hour,
      temperature: temperatures[index] ?? null,
      precipitation: precipitation[index] ?? 0,
      rainChance: rainChance[index] ?? null,
      cloudCover: cloudCover[index] ?? null,
      wind: wind[index] ?? null,
      ...weather,
    }

    const current = byDay.get(dayId) ?? []
    current.push(slot)
    byDay.set(dayId, current)
  })

  return [...byDay.entries()].map(([dayId, hours]) => {
    const temps = hours.map((item) => item.temperature).filter((value) => value != null)
    const rainHours = hours.filter((item) => (item.precipitation ?? 0) > 0.1 || item.tone === "rain" || item.tone === "storm")
    const condition = pickDominantCondition(hours)
    const peakRainChance = Math.max(0, ...hours.map((item) => item.rainChance ?? 0))

    return {
      dayId,
      hours,
      condition,
      high: temps.length ? Math.round(Math.max(...temps)) : null,
      low: temps.length ? Math.round(Math.min(...temps)) : null,
      rainHours: rainHours.length,
      peakRainChance,
      windowLabel: "07:00 – 17:00 · morning to dusk",
    }
  })
}

export function summarizeWeekForecast(days) {
  if (!Array.isArray(days) || days.length === 0) return null

  const highs = days.map((day) => day.high).filter((value) => value != null)
  const lows = days.map((day) => day.low).filter((value) => value != null)
  const wetDays = days.filter((day) => (day.rainHours ?? 0) > 0)
  const peakRainChance = Math.max(0, ...days.map((day) => day.peakRainChance ?? 0))
  const conditionHours = days.map((day) => ({
    label: day.condition?.label || "Forecast",
    tone: day.condition?.tone || "cloudy",
    icon: day.condition?.icon || "cloud-sun",
    precipitation: day.rainHours ?? 0,
  }))

  return {
    condition: pickDominantCondition(conditionHours),
    high: highs.length ? Math.round(Math.max(...highs)) : null,
    low: lows.length ? Math.round(Math.min(...lows)) : null,
    wetDays: wetDays.length,
    peakRainChance,
  }
}

/** Solid hex palettes that html2canvas can paint into PDF (no oklch, gradients, or blur). */
export function weatherTonePalette(tone) {
  switch (tone) {
    case "sunny":
      return { bg: "#e36b2c", chip: "#c85a22", text: "#ffffff", muted: "#ffe8d6", hourBg: "#fff4ea", hourText: "#9a3f10", accent: "#f5c14a" }
    case "partly":
      return { bg: "#ef7a32", chip: "#d46624", text: "#ffffff", muted: "#ffe9d4", hourBg: "#fff6ee", hourText: "#9a4312", accent: "#f6b86a" }
    case "rain":
      return { bg: "#6b7280", chip: "#52525b", text: "#ffffff", muted: "#e4e4e7", hourBg: "#f4f4f5", hourText: "#3f3f46", accent: "#a1a1aa" }
    case "storm":
      return { bg: "#52525b", chip: "#3f3f46", text: "#ffffff", muted: "#d4d4d8", hourBg: "#f4f4f5", hourText: "#27272a", accent: "#a1a1aa" }
    case "cold":
      return { bg: "#647b93", chip: "#51657a", text: "#ffffff", muted: "#e2eaf1", hourBg: "#eef3f7", hourText: "#2f4254", accent: "#9bb4c7" }
    case "fog":
      return { bg: "#7a838d", chip: "#646c75", text: "#ffffff", muted: "#eceff2", hourBg: "#f4f5f6", hourText: "#3a424a", accent: "#c5ced6" }
    case "snow":
      return { bg: "#6b8499", chip: "#566d80", text: "#ffffff", muted: "#e4eef5", hourBg: "#f2f6f9", hourText: "#2e4456", accent: "#c5d6e3" }
    default:
      return { bg: "#6b7c8d", chip: "#566573", text: "#ffffff", muted: "#e6edf2", hourBg: "#f1f4f6", hourText: "#33404c", accent: "#b7c4cf" }
  }
}

const COLD_HIGH_C = 16

export function resolveWeatherCardTone(conditionTone, temperature) {
  if (conditionTone === "rain" || conditionTone === "storm") return "rain"
  if (conditionTone === "snow") return "cold"
  if (temperature != null && Number(temperature) <= COLD_HIGH_C) return "cold"
  if (conditionTone === "sunny" || conditionTone === "partly") return "sunny"
  return "cold"
}

export function weatherToneClasses(tone) {
  const palette = weatherTonePalette(tone)
  return {
    ...palette,
    card: "",
    chip: "",
    active: "",
  }
}
