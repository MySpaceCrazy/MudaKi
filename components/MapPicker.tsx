// components/MapPicker.tsx
"use client";

import { useEffect, useRef } from "react";

type MapsLib = google.maps.MapsLibrary;
type PlacesLib = google.maps.PlacesLibrary;

export default function MapPicker({
  onChange,
  initialCenter = { lat: -23.55052, lng: -46.633308 }, // São Paulo
  initialZoom = 12,
}: {
  onChange: (v: { lat: number; lng: number; address: string }) => void;
  initialCenter?: { lat: number; lng: number };
  initialZoom?: number;
}) {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    let map: google.maps.Map | null = null;
    let marker: google.maps.Marker | null = null;
    let clickListener: google.maps.MapsEventListener | null = null;

    async function init() {
      // 1) Configura a chave e libraries (API funcional)
      // @ts-ignore: objeto global após carregamento do script no layout
      google.maps.setOptions({
        apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
        libraries: ["places"],
      });

      // 2) Carrega as libraries necessárias
      const [{ Map }, _placesLib] = (await Promise.all([
        // @ts-ignore
        google.maps.importLibrary("maps") as Promise<MapsLib>,
        // @ts-ignore
        google.maps.importLibrary("places") as Promise<PlacesLib>,
      ])) as [MapsLib, PlacesLib];

      // 3) Cria o mapa
      map = new Map(mapRef.current as HTMLElement, {
        center: initialCenter,
        zoom: initialZoom,
        disableDefaultUI: false,
      });

      // 4) Marcador
      marker = new google.maps.Marker({
        position: initialCenter,
        map,
        draggable: false, // deixe true se quiser arrastar
      });

      const geocoder = new google.maps.Geocoder();

      // Função padrão para atualizar endereço e avisar o pai
      const pushChange = async (lat: number, lng: number) => {
        let address = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        try {
          const { results } = await geocoder.geocode({ location: { lat, lng } });
          if (results?.[0]?.formatted_address) {
            address = results[0].formatted_address;
          }
        } catch {
          // mantém o fallback
        }
        onChange({ lat, lng, address });
      };

      // 5) Clique no mapa -> move marcador + reverse geocoding
      clickListener = map.addListener("click", async (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return;
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();

        marker!.setPosition({ lat, lng });
        map!.panTo({ lat, lng });

        await pushChange(lat, lng);
      });

      // Dispara o valor inicial
      await pushChange(initialCenter.lat, initialCenter.lng);
    }

    init().catch(console.error);

    // cleanup
    return () => {
      if (clickListener) clickListener.remove();
      marker = null;
      map = null;
    };
  }, [initialCenter, initialZoom, onChange]);

  return (
    <div
      ref={mapRef}
      className="h-80 w-full rounded-2xl overflow-hidden border border-white/10"
    />
  );
}
