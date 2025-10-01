"use client";

import { useEffect, useRef } from "react";
import { setOptions } from "@googlemaps/js-api-loader";

type MapValue = { lat: number; lng: number; address: string };

export default function MapPicker({
  onChange,
}: {
  onChange: (v: MapValue) => void;
}) {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapRef.current || typeof window === "undefined") return;

    const init = async () => {
      // 1) Configura API Key + libs (cast para contornar tipos do pacote)
      setOptions({
        apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
        libraries: ["places"],
      } as any);

      // 2) Importa as libs usando a API funcional
      const [{ Map }, { Marker }, { Geocoder }] = await Promise.all([
        google.maps.importLibrary("maps") as Promise<typeof google.maps>,
        google.maps.importLibrary("marker") as Promise<typeof google.maps>,
        google.maps.importLibrary("geocoding") as Promise<typeof google.maps>,
      ]);

      const center = { lat: -23.55052, lng: -46.633308 };

      const map = new Map(mapRef.current!, {
        center,
        zoom: 12,
        disableDefaultUI: false,
      });

      const marker = new Marker({
        position: center,
        map,
        draggable: true,
      });

      const geocoder = new Geocoder();

      const update = (pos: google.maps.LatLng | google.maps.LatLngLiteral) => {
        const loc =
          pos instanceof google.maps.LatLng ? pos : new google.maps.LatLng(pos);
        geocoder.geocode({ location: loc }, (results, status) => {
          const address =
            status === "OK" ? results?.[0]?.formatted_address ?? "" : "";
          onChange({ lat: loc.lat(), lng: loc.lng(), address });
        });
      };

      marker.addListener("dragend", () => update(marker.getPosition()!));
      map.addListener("click", (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return;
        marker.setPosition(e.latLng);
        update(e.latLng);
      });

      update(marker.getPosition()!);
    };

    init();
  }, [onChange]);

  return (
    <div
      ref={mapRef}
      className="h-80 w-full rounded-2xl overflow-hidden bg-black/10"
    />
  );
}
