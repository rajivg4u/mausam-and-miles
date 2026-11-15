
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const params = new URL(request.url).searchParams;

  const latitude = Number(params.get("lat"));
  const longitude = Number(params.get("lon"));
  const radiusKm = Number(params.get("radius") ?? 10);

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    ![5, 10, 20, 30].includes(radiusKm)
  ) {
    return NextResponse.json(
      { error: "Invalid location or search radius." },
      { status: 400 }
    );
  }

  const radius = radiusKm * 1000;

  const query = `
    [out:json][timeout:25];
    (
      node["tourism"~"attraction|museum|viewpoint|artwork|gallery"](around:${radius},${latitude},${longitude});
      way["tourism"~"attraction|museum|viewpoint|gallery"](around:${radius},${latitude},${longitude});
      relation["tourism"~"attraction|museum|viewpoint|gallery"](around:${radius},${latitude},${longitude});
      node["historic"~"monument|castle|archaeological_site|fort"](around:${radius},${latitude},${longitude});
      way["historic"~"monument|castle|archaeological_site|fort"](around:${radius},${latitude},${longitude});
      node["leisure"="park"](around:${radius},${latitude},${longitude});
      way["leisure"="park"](around:${radius},${latitude},${longitude});
    );
    out center tags;
  `;

  try {
    const response = await fetch(
      "https://overpass-api.de/api/interpreter",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({ data: query }).toString(),
        cache: "no-store"
      }
    );

    if (!response.ok) {
      throw new Error("Places provider unavailable");
    }

    const data = await response.json();

    const places = (data.elements ?? [])
      .map((item: {
        id: number;
        lat?: number;
        lon?: number;
        center?: { lat: number; lon: number };
        tags?: Record<string, string>;
      }) => {
        const lat = item.lat ?? item.center?.lat;
        const lon = item.lon ?? item.center?.lon;

        if (lat == null || lon == null) return null;

        const tags = item.tags ?? {};
        const distance = haversine(latitude, longitude, lat, lon);

        return {
          id: item.id,
          name: tags.name ?? tags["name:en"] ?? "Unnamed attraction",
          category:
            tags.tourism ??
            tags.historic ??
            tags.leisure ??
            "attraction",
          latitude: lat,
          longitude: lon,
          distance: Number(distance.toFixed(1)),
          website: tags.website ?? undefined,
          fee: tags.fee ?? undefined
        };
      })
      .filter(Boolean)
      .sort(
        (a: { distance: number }, b: { distance: number }) =>
          a.distance - b.distance
      );

    return NextResponse.json(places);
  } catch {
    return NextResponse.json(
      { error: "Nearby attractions are temporarily unavailable." },
      { status: 502 }
    );
  }
}

function haversine(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const earthRadius = 6371;
  const toRadians = (value: number) => (value * Math.PI) / 180;

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) ** 2;

  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
