
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const query = new URL(request.url).searchParams.get("q")?.trim();

  if (!query || query.length < 2) {
    return NextResponse.json(
      { error: "Enter a city name." },
      { status: 400 }
    );
  }

  try {
    const url = new URL("https://geocoding-api.open-meteo.com/v1/search");

    url.search = new URLSearchParams({
      name: query,
      count: "8",
      language: "en",
      format: "json"
    }).toString();

    const response = await fetch(url.toString(), {
      next: { revalidate: 86400 }
    });

    if (!response.ok) {
      throw new Error("Geocoding provider unavailable");
    }

    const data = await response.json();

    const cities = (data.results ?? []).map(
      (item: {
        name: string;
        country?: string;
        latitude: number;
        longitude: number;
        admin1?: string;
      }) => ({
        name: item.name,
        country: item.country ?? "",
        state: item.admin1 ?? "",
        latitude: item.latitude,
        longitude: item.longitude
      })
    );

    return NextResponse.json(cities);
  } catch {
    return NextResponse.json(
      { error: "Unable to search for this city." },
      { status: 502 }
    );
  }
}
