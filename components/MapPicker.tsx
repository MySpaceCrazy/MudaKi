"use client";

import { useEffect, useRef } from "react";
import { setKey, setLibraries, importLibrary } from "@googlemaps/js-api-loader";

export default function MapPicker({
  onChange,
}: {
  onChange: (v: { lat: number; lng: number; address: string }) => void;
}) {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    const init = async () => {
      // ✅ Defina a chave e as bibliotecas antes de importar
      setKey(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string);
      setLibraries(["places"]);

      // ✅ Importe as libs de forma funcional (API nova)
      const { Map } = (await importLibrary("maps")) as google.maps.MapsLibrary;
      const { Marker } = (await importLibrary("marker")) as google.maps.MarkerLibrary;
      const { Geocoder } = (await importLibrary("geocoding")) as google.maps.GeocodingLibrary;

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

      const update = async (pos: google.maps.LatLng) => {
        const { results } = await geocoder.geocode({ location: pos });
        const address = results?.[0]?.formatted_address ?? "";
        onChange({ lat: pos.lat(), lng: pos.lng(), address });
      };

      marker.addListener("dragend", () => update(marker.getPosition()!));
      map.addListener("click", (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
          marker.setPosition(e.latLng);
          update(e.latLng);
        }
      });

      // Primeira leitura
      update(marker.getPosition()!);
    };

    init();
  }, [onChange]);

  return (
    <div
      ref={mapRef}
      className="h-80 w-full rounded-2xl overflow-hidden border border-white/10"
    />
  );
}
