
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const latitude = Number(searchParams.get("lat"));
  const longitude = Number(searchParams.get("lon"));

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return NextResponse.json(
      { error: "Valid latitude and longitude are required." },
      { status: 400 }
    );
  }

  try {
    const url = new URL("https://api.open-meteo.com/v1/forecast");

    url.search = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      current: [
        "temperature_2m",
        "relative_humidity_2m",
        "apparent_temperature",
        "is_day",
        "precipitation",
        "weather_code",
        "wind_speed_10m"
      ].join(","),
      hourly: [
        "temperature_2m",
        "precipitation_probability"
      ].join(","),
      daily: [
        "weather_code",
        "temperature_2m_max",
        "temperature_2m_min",
        "precipitation_probability_max"
      ].join(","),
      timezone: "auto",
      forecast_days: "7"
    }).toString();

    const response = await fetch(url.toString(), {
      next: { revalidate: 900 }
    });

    if (!response.ok) {
      throw new Error("Weather provider unavailable");
    }

    const data = await response.json();

    const weather = {
      current: {
        temperature: data.current.temperature_2m,
        feelsLike: data.current.apparent_temperature,
        humidity: data.current.relative_humidity_2m,
        windSpeed: data.current.wind_speed_10m,
        code: data.current.weather_code,
        isDay: data.current.is_day === 1
      },
      hourly: data.hourly.time.slice(0, 12).map(
        (time: string, index: number) => ({
          time,
          temperature: data.hourly.temperature_2m[index],
          rainProbability:
            data.hourly.precipitation_probability[index] ?? 0
        })
      ),
      daily: data.daily.time.map(
        (date: string, index: number) => ({
          date,
          max: data.daily.temperature_2m_max[index],
          min: data.daily.temperature_2m_min[index],
          rain: data.daily.precipitation_probability_max[index] ?? 0,
          code: data.daily.weather_code[index]
        })
      )
    };

    return NextResponse.json(weather);
  } catch {
    return NextResponse.json(
      { error: "Unable to retrieve weather information." },
      { status: 502 }
    );
  }
}
