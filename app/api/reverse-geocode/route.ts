
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const params = new URL(request.url).searchParams;
  const lat = Number(params.get("lat"));
  const lon = Number(params.get("lon"));

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lon) ||
    lat < -90 ||
    lat > 90 ||
    lon < -180 ||
    lon > 180 ||
    !params.has("lat") ||
    !params.has("lon")
  ) {
    return NextResponse.json(
      { error: "Invalid coordinates." },
      { status: 400 }
    );
  }

  try {
    const url = new URL(
      "https://nominatim.openstreetmap.org/reverse"
    );

    url.search = new URLSearchParams({
      lat: String(lat),
      lon: String(lon),
      format: "json",
      addressdetails: "1",
      zoom: "14",
      "accept-language": "en",
    }).toString();

    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent": "MausamAndMiles/1.0 (travel weather application)",
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Reverse geocoding failed");
    }

    const data = await response.json();
    const address = data.address ?? {};

    const locality =
      address.suburb ||
      address.neighbourhood ||
      address.city_district ||
      address.city ||
      address.town ||
      address.village ||
      address.county ||
      address.state_district;

    const city =
      address.city ||
      address.town ||
      address.village ||
      address.county;

    const name = locality || city || "Current location";

    const region = [city, address.state]
      .filter(
        (value, index, values) =>
          value && value !== name && values.indexOf(value) === index
      )
      .join(", ");

    return NextResponse.json({
      name,
      state: region,
      country: address.country || "",
      latitude: lat,
      longitude: lon,
    });
  } catch (error) {
    console.error("Reverse geocoding error:", error);

    return NextResponse.json(
      { error: "Unable to identify location." },
      { status: 502 }
    );
  }
}
