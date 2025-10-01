"use client";

import { useEffect, useRef } from "react";
import { Loader } from "@googlemaps/js-api-loader";

type MapValue = { lat: number; lng: number; address: string };

export default function MapPicker({
  onChange,
}: {
  onChange: (v: MapValue) => void;
}) {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    const init = async () => {
      // 1) Carrega Google Maps com o Loader (v1.x)
      const loader = new Loader({
        apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
        libraries: ["places"],
      });

      await loader.load(); // habilita window.google

      // 2) Importa libs de forma funcional (já disponível após loader.load())
      const { Map } = (await google.maps.importLibrary("maps")) as google.maps.MapsLibrary;
      const { Marker } = (await google.maps.importLibrary("marker")) as google.maps.MarkerLibrary;
      const { Geocoder } = (await google.maps.importLibrary("geocoding")) as google.maps.GeocodingLibrary;

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

      const update = (pos: google.maps.LatLng | null) => {
        if (!pos) return;
        geocoder.geocode({ location: pos }, (res) => {
          const address = res?.[0]?.formatted_address ?? "";
          onChange({ lat: pos.lat(), lng: pos.lng(), address });
        });
      };

      marker.addListener("dragend", () => update(marker.getPosition()));
      map.addListener("click", (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return;
        marker.setPosition(e.latLng);
        update(e.latLng);
      });

      // dispara 1ª leitura
      update(marker.getPosition());
    };

    init();
  }, [onChange]);

  return <div ref={mapRef} className="h-80 w-full rounded-2xl overflow-hidden bg-black/10" />;
}
