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
      return { bg: "#1565a8", chip: "#0e4d82", text: "#ffffff", muted: "#d7ecfb", hourBg: "#f4f8fc", hourText: "#16324d", accent: "#f5c14a" }
    case "partly":
      return { bg: "#1f6f9f", chip: "#18587e", text: "#ffffff", muted: "#d9eef8", hourBg: "#f4f8fb", hourText: "#17364a", accent: "#7ec8e8" }
    case "rain":
      return { bg: "#2f4f78", chip: "#243d5d", text: "#ffffff", muted: "#dce6f2", hourBg: "#f3f6fa", hourText: "#1d2d42", accent: "#8fb4d9" }
    case "storm":
      return { bg: "#3b3f6b", chip: "#2c3054", text: "#ffffff", muted: "#e0e2f0", hourBg: "#f4f4f8", hourText: "#25263d", accent: "#c4b5fd" }
    case "fog":
      return { bg: "#5b6773", chip: "#46515b", text: "#ffffff", muted: "#e6eaee", hourBg: "#f5f6f7", hourText: "#2f3942", accent: "#c5ced6" }
    case "snow":
      return { bg: "#4d6d85", chip: "#3b5569", text: "#ffffff", muted: "#e3edf4", hourBg: "#f5f8fb", hourText: "#2a3c4a", accent: "#d7e7f2" }
    default:
      return { bg: "#4a5563", chip: "#3a434e", text: "#ffffff", muted: "#e5e8ec", hourBg: "#f5f6f7", hourText: "#2d3640", accent: "#cbd5e1" }
  }
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
