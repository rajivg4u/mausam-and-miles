import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const maxDuration = 30;

type Place = {
  id: number; name: string; category: string;
  latitude: number; longitude: number; distance: number;
  website?: string; fee?: string;
};
function dbClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase server configuration");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

type DB = ReturnType<typeof dbClient>;
function jsonPlaces(places: Place[]) {
  return NextResponse.json(places, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
async function nearby(db: DB, lat: number, lon: number, radius: number): Promise<Place[]> {
  const { data, error } = await db.rpc("nearby_attractions", {
    p_lat: lat, p_lon: lon, p_radius_km: radius, p_limit: 100,
  });
  if (error) throw error;
  return (data ?? []).map((p: Place) => ({ ...p, website: p.website ?? undefined, fee: p.fee ?? undefined }));
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const latRaw = params.get("lat");
  const lonRaw = params.get("lon");
  const lat = latRaw === null ? NaN : Number(latRaw);
  const lon = lonRaw === null ? NaN : Number(lonRaw);
  const radiusKm = Number(params.get("radius") ?? 10);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90 ||
      !Number.isFinite(lon) || lon < -180 || lon > 180 ||
      ![5, 10, 20, 30].includes(radiusKm)) {
    return NextResponse.json({ error: "Invalid location or search radius." }, { status: 400 });
  }
  try {
    const db = dbClient();
    const places = await nearby(db, lat, lon, radiusKm);
    const { error: queueError } = await db.rpc("enqueue_attraction_tiles", { p_lat: lat, p_lon: lon, p_radius_km: radiusKm });
    if (queueError) console.warn("Attraction queue unavailable:", queueError.message);
    return jsonPlaces(places);
  } catch (error) {
    console.error("Attractions database error:", error);
    return NextResponse.json({ error: "Nearby attractions are temporarily unavailable." }, { status: 503 });
  }
}
