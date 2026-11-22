import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

const OVERPASS_ENDPOINTS = [
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass-api.de/api/interpreter",
  "https://overpass.nchc.org.tw/api/interpreter",
];

type OverpassElement = {
  id: number;
  type: "node" | "way" | "relation";
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

type OverpassResponse = { elements?: OverpassElement[] };

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const latParam = params.get("lat");
  const lonParam = params.get("lon");
  const latitude = latParam === null ? NaN : Number(latParam);
  const longitude = lonParam === null ? NaN : Number(lonParam);
  const radiusKm = Number(params.get("radius") ?? 10);

  if (
    !Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
    !Number.isFinite(longitude) || longitude < -180 || longitude > 180 ||
    ![5, 10, 20, 30].includes(radiusKm)
  ) {
    return NextResponse.json(
      { error: "Invalid location or search radius." },
      { status: 400 }
    );
  }

  const radius = radiusKm * 1000;
  const query = `
    [out:json][timeout:18];
    (
      nwr["tourism"~"^(attraction|museum|viewpoint|artwork|gallery)$"](around:${radius},${latitude},${longitude});
      nwr["historic"~"^(monument|castle|archaeological_site|fort)$"](around:${radius},${latitude},${longitude});
      nwr["leisure"="park"](around:${radius},${latitude},${longitude});
    );
    out center tags;
  `;

  const body = new URLSearchParams({ data: query }).toString();
  const failures: string[] = [];

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
        cache: "no-store",
        signal: AbortSignal.timeout(8500),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = (await response.json()) as OverpassResponse;
      if (!Array.isArray(data.elements)) {
        throw new Error("Invalid Overpass response");
      }

      const places = data.elements
        .map((item) => {
          const lat = item.lat ?? item.center?.lat;
          const lon = item.lon ?? item.center?.lon;
          if (lat === undefined || lon === undefined) return null;
          const tags = item.tags ?? {};
          const name = tags.name ?? tags["name:en"];
          if (!name) return null;
          return {
            id: item.id,
            name,
            category: tags.tourism ?? tags.historic ?? tags.leisure ?? "attraction",
            latitude: lat,
            longitude: lon,
            distance: Number(haversine(latitude, longitude, lat, lon).toFixed(1)),
            website: tags.website ?? tags["contact:website"] ?? undefined,
            fee: tags.fee ?? undefined,
          };
        })
        .filter((place): place is NonNullable<typeof place> => place !== null)
        .sort((a, b) => a.distance - b.distance);

      return NextResponse.json(places, {
        headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`${endpoint}: ${message}`);
      console.warn("Overpass endpoint failed:", endpoint, message);
    }
  }

  console.error("All Overpass endpoints failed:", failures);
  return NextResponse.json(
    { error: "Nearby attractions are temporarily unavailable. Please try again." },
    { status: 502 }
  );
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
