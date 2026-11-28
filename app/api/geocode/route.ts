import { requireApiUser } from "@/lib/supabase/require-user";

import { NextRequest, NextResponse } from "next/server";

type GeocodeResult = {
  id?: number;
  name: string;
  country?: string;
  country_code?: string;
  latitude: number;
  longitude: number;
  admin1?: string;
  population?: number;
};

const CITY_ALIASES: Record<string, string> = {
  bangalore: "Bengaluru",
  bombay: "Mumbai",
  madras: "Chennai",
  calcutta: "Kolkata",
  poona: "Pune",
  trivandrum: "Thiruvananthapuram",
  cochin: "Kochi",
  mysore: "Mysuru",
  mangalore: "Mangaluru",
  gurgaon: "Gurugram",
  allahabad: "Prayagraj",
};

export async function GET(request: NextRequest) {
  const denied = await requireApiUser();
  if (denied) return denied;
  const query = new URL(request.url)
    .searchParams.get("q")
    ?.trim();

  if (!query || query.length < 2) {
    return NextResponse.json(
      { error: "Enter a city name." },
      { status: 400 }
    );
  }

  try {
    const normalizedQuery = query.toLowerCase();
    const searchTerm = CITY_ALIASES[normalizedQuery] ?? query;

    const url = new URL(
      "https://geocoding-api.open-meteo.com/v1/search"
    );

    url.search = new URLSearchParams({
      name: searchTerm,
      count: "30",
      language: "en",
      format: "json",
      countryCode: "IN",
    }).toString();

    const response = await fetch(url.toString(), {
      next: { revalidate: 86400 },
    });

    if (!response.ok) {
      throw new Error("Geocoding provider unavailable");
    }

    const data: { results?: GeocodeResult[] } =
      await response.json();

    const uniqueCities = new Map<string, GeocodeResult>();

    for (const item of data.results ?? []) {
      if (item.country_code !== "IN") continue;

      const key = [
        item.name.toLowerCase(),
        (item.admin1 ?? "").toLowerCase(),
        item.latitude.toFixed(3),
        item.longitude.toFixed(3),
      ].join("|");

      if (!uniqueCities.has(key)) {
        uniqueCities.set(key, item);
      }
    }

    const cities = [...uniqueCities.values()]
      .sort((a, b) => {
        const aExact =
          a.name.toLowerCase() === searchTerm.toLowerCase();
        const bExact =
          b.name.toLowerCase() === searchTerm.toLowerCase();

        if (aExact !== bExact) {
          return aExact ? -1 : 1;
        }

        return (b.population ?? 0) - (a.population ?? 0);
      })
      .slice(0, 8)
      .map((item) => ({
        name: item.name,
        country: item.country ?? "India",
        state: item.admin1 ?? "",
        latitude: item.latitude,
        longitude: item.longitude,
      }));

    return NextResponse.json(cities);
  } catch (error) {
    console.error("Geocoding error:", error);

    return NextResponse.json(
      { error: "Unable to search for this city." },
      { status: 502 }
    );
  }
}
