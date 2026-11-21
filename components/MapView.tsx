<<<<<<< HEAD

"use client";

import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";
import type { Place } from "@/lib/types";

import "leaflet/dist/leaflet.css";

type Props = {
  latitude: number;
  longitude: number;
  places: Place[];
};

const attractionIcon = L.divIcon({
  className: "attraction-marker",
  html: '<div class="map-pin">📍</div>',
  iconSize: [32, 32],
  iconAnchor: [16, 28]
});

export default function MapView({
  latitude,
  longitude,
  places
}: Props) {
  return (
    <MapContainer
      center={[latitude, longitude]}
      zoom={12}
      scrollWheelZoom
      className="map-container"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <Marker position={[latitude, longitude]}>
        <Popup>Your selected location</Popup>
      </Marker>

      {places.map((place) => (
        <Marker
          key={place.id}
          position={[place.latitude, place.longitude]}
          icon={attractionIcon}
        >
          <Popup>
            <strong>{place.name}</strong>
            <br />
            {place.category}
            <br />
            {place.distance} km away
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
=======

"use client";

import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";
import type { Place } from "@/lib/types";

import "leaflet/dist/leaflet.css";

type Props = {
  latitude: number;
  longitude: number;
  places: Place[];
};

const attractionIcon = L.divIcon({
  className: "attraction-marker",
  html: '<div class="map-pin">📍</div>',
  iconSize: [32, 32],
  iconAnchor: [16, 28]
});

export default function MapView({
  latitude,
  longitude,
  places
}: Props) {
  return (
    <MapContainer
      center={[latitude, longitude]}
      zoom={12}
      scrollWheelZoom
      className="map-container"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <Marker position={[latitude, longitude]}>
        <Popup>Your selected location</Popup>
      </Marker>

      {places.map((place) => (
        <Marker
          key={place.id}
          position={[place.latitude, place.longitude]}
          icon={attractionIcon}
        >
          <Popup>
            <strong>{place.name}</strong>
            <br />
            {place.category}
            <br />
            {place.distance} km away
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
>>>>>>> e8c6f1a (Fix Vercel build errors)
