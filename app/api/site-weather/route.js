import { NextResponse } from "next/server"
import { readResponseJson } from "@/lib/safeJson"
import {
  SITE_WEATHER_FALLBACK,
  SITE_WEATHER_TIMEZONE,
  buildWorkingHoursForecast,
} from "@/lib/siteWeather"

export const dynamic = "force-dynamic"

const DAY_ID_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function isValidDayId(value) {
  return DAY_ID_PATTERN.test(value)
}

async function geocodeSite(query) {
  const name = String(query || "").trim()
  if (!name) return SITE_WEATHER_FALLBACK

  const url = new URL("https://geocoding-api.open-meteo.com/v1/search")
  url.searchParams.set("name", name)
  url.searchParams.set("count", "1")
  url.searchParams.set("language", "en")
  url.searchParams.set("format", "json")

  try {
    const response = await fetch(url, { cache: "force-cache" })
    if (!response.ok) return SITE_WEATHER_FALLBACK
    const data = await readResponseJson(response, null)
    const hit = data?.results?.[0]
    if (!hit) return SITE_WEATHER_FALLBACK

    return {
      name: hit.name,
      country: hit.country,
      latitude: hit.latitude,
      longitude: hit.longitude,
    }
  } catch {
    return SITE_WEATHER_FALLBACK
  }
}

function weatherApiForRange(start, end) {
  const today = new Date()
  const startDate = new Date(`${start}T00:00:00Z`)
  const ageDays = Math.round((today - startDate) / (1000 * 60 * 60 * 24))

  if (ageDays > 7) {
    return "https://archive-api.open-meteo.com/v1/archive"
  }

  return "https://api.open-meteo.com/v1/forecast"
}

async function fetchWeatherPayload(endpoint, location, start, end) {
  const url = new URL(endpoint)
  url.searchParams.set("latitude", String(location.latitude))
  url.searchParams.set("longitude", String(location.longitude))
  url.searchParams.set("start_date", start)
  url.searchParams.set("end_date", end)
  url.searchParams.set("timezone", SITE_WEATHER_TIMEZONE)
  url.searchParams.set(
    "hourly",
    "temperature_2m,precipitation,precipitation_probability,weather_code,cloud_cover,wind_speed_10m"
  )

  const response = await fetch(url, { cache: "no-store" })
  if (!response.ok) {
    throw new Error(`Weather upstream failed with ${response.status}`)
  }

  return readResponseJson(response, {})
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const start = searchParams.get("start") || ""
  const end = searchParams.get("end") || start
  const site = searchParams.get("site") || ""

  if (!isValidDayId(start) || !isValidDayId(end) || start > end) {
    return NextResponse.json({ error: "A valid report date is required." }, { status: 400 })
  }

  const location = await geocodeSite(
    site ? `${site}${/,?\s*zimbabwe/i.test(site) ? "" : ", Zimbabwe"}` : SITE_WEATHER_FALLBACK.name
  )
  const endpoint = weatherApiForRange(start, end)

  try {
    let payload
    try {
      payload = await fetchWeatherPayload(endpoint, location, start, end)
    } catch {
      payload = await fetchWeatherPayload(
        endpoint.includes("archive")
          ? "https://api.open-meteo.com/v1/forecast"
          : "https://archive-api.open-meteo.com/v1/archive",
        location,
        start,
        end
      )
    }

    const days = buildWorkingHoursForecast(payload)

    return NextResponse.json(
      {
        location: {
          name: location.name,
          country: location.country,
        },
        start,
        end,
        windowLabel: "Working hours 07:00 – 17:00 (morning to dusk)",
        days,
      },
      {
        headers: {
          "Cache-Control": "public, max-age=900",
        },
      }
    )
  } catch {
    return NextResponse.json(
      { error: "Weather forecast is unavailable right now." },
      { status: 503 }
    )
  }
}
