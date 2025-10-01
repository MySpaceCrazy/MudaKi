"use client";

import { useEffect, useRef } from "react";
import { Loader } from "@googlemaps/js-api-loader";

export type Place = { lat: number; lng: number; address?: string };

export default function MapRoute({
  origin,
  destination,
  onDistance,
}: {
  origin: Place | null;
  destination: Place | null;
  onDistance?: (meters: number, text: string, durationText?: string) => void;
}) {
  const mapDivRef = useRef<HTMLDivElement | null>(null);

  // instâncias do Maps
  const mapRef = useRef<google.maps.Map | null>(null);
  const directionsSvcRef = useRef<google.maps.DirectionsService | null>(null);
  const directionsRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const startMarkerRef = useRef<google.maps.Marker | null>(null);
  const endMarkerRef = useRef<google.maps.Marker | null>(null);

  // badge de distância/tempo
  const distanceCtrlRef = useRef<HTMLDivElement | null>(null);

  // init
  useEffect(() => {
    if (!mapDivRef.current) return;

    (async () => {
      const loader = new Loader({
        apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
        libraries: ["places"],
      });
      await loader.load();

      const { Map } = (await google.maps.importLibrary("maps")) as google.maps.MapsLibrary;
      const { DirectionsService, DirectionsRenderer } =
        (await google.maps.importLibrary("routes")) as google.maps.RoutesLibrary;
      const { Marker } =
        (await google.maps.importLibrary("marker")) as google.maps.MarkerLibrary;

      // centro padrão (SP)
      const center = { lat: -23.55052, lng: -46.633308 };

      mapRef.current = new Map(mapDivRef.current as HTMLElement, {
        center,
        zoom: 12,
        disableDefaultUI: false,
        streetViewControl: true,
        fullscreenControl: true,
      });

      directionsSvcRef.current = new DirectionsService();
      directionsRef.current = new DirectionsRenderer({
        map: mapRef.current!,
        suppressMarkers: true,
        polylineOptions: {
          strokeColor: "#7c3aed",
          strokeOpacity: 0.9,
          strokeWeight: 6,
        },
      });

      startMarkerRef.current = new Marker({
        map: mapRef.current!,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 7,
          fillColor: "#22c55e",
          fillOpacity: 1,
          strokeColor: "#0f172a",
          strokeWeight: 2,
        },
      });

      endMarkerRef.current = new Marker({
        map: mapRef.current!,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 7,
          fillColor: "#ef4444",
          fillOpacity: 1,
          strokeColor: "#0f172a",
          strokeWeight: 2,
        },
      });

      // badge Distância/Tempo no topo do mapa
      const ctrl = document.createElement("div");
      ctrl.style.padding = "8px 14px";
      ctrl.style.borderRadius = "999px";
      ctrl.style.background =
        "linear-gradient(180deg,rgba(124,58,237,.18), rgba(124,58,237,.08))";
      ctrl.style.border = "1px solid rgba(124,58,237,.35)";
      ctrl.style.color = "#efeaff";
      ctrl.style.fontWeight = "600";
      ctrl.style.fontSize = "14px";
      ctrl.style.boxShadow = "0 10px 30px rgba(0,0,0,.25)";
      ctrl.style.backdropFilter = "blur(6px)";
      ctrl.innerText = "Distância: —";
      distanceCtrlRef.current = ctrl;
      mapRef.current.controls[google.maps.ControlPosition.TOP_CENTER].push(ctrl);
    })();
  }, []);

  // atualiza mapa/rota
  useEffect(() => {
    const svc = directionsSvcRef.current;
    const renderer = directionsRef.current;
    const map = mapRef.current;

    if (!map) return;

    // 1) Sem origem e destino -> só limpa tudo
    if (!origin && !destination) {
      renderer?.set("directions", null as any);
      distanceCtrlRef.current && (distanceCtrlRef.current.innerText = "Distância: —");
      startMarkerRef.current?.setPosition(null);
      endMarkerRef.current?.setPosition(null);
      return;
    }

    // 2) Só ORIGEM -> centraliza no ponto e coloca o marcador verde
    if (origin && !destination) {
      renderer?.set("directions", null as any);
      distanceCtrlRef.current && (distanceCtrlRef.current.innerText = "Distância: —");

      const pos = new google.maps.LatLng(origin.lat, origin.lng);
      startMarkerRef.current?.setPosition(pos);
      startMarkerRef.current?.setTitle(origin.address ?? "Origem");
      endMarkerRef.current?.setPosition(null);

      map.setCenter(pos);
      map.setZoom(15);
      return;
    }

    // 3) ORIGEM + DESTINO -> calcula rota
    if (!svc || !renderer || !origin || !destination) return;

    svc.route(
      {
        origin: { lat: origin.lat, lng: origin.lng },
        destination: { lat: destination.lat, lng: destination.lng },
        travelMode: google.maps.TravelMode.DRIVING,
        provideRouteAlternatives: false,
      },
      (result, status) => {
        if (status !== google.maps.DirectionsStatus.OK || !result) {
          renderer.set("directions", null as any);
          distanceCtrlRef.current && (distanceCtrlRef.current.innerText = "Distância: —");
          return;
        }

        renderer.setDirections(result);

        const leg = result.routes[0]?.legs?.[0];
        if (leg?.start_location && leg?.end_location) {
          const bounds = new google.maps.LatLngBounds();
          bounds.extend(leg.start_location);
          bounds.extend(leg.end_location);
          map.fitBounds(bounds);
        }

        if (startMarkerRef.current && leg?.start_location) {
          startMarkerRef.current.setPosition(leg.start_location);
          startMarkerRef.current.setTitle(origin.address ?? "Origem");
        }
        if (endMarkerRef.current && leg?.end_location) {
          endMarkerRef.current.setPosition(leg.end_location);
          endMarkerRef.current.setTitle(destination.address ?? "Destino");
        }

        const dText = leg?.distance?.text ?? "—";
        const dMeters = leg?.distance?.value ?? 0;
        const durText = leg?.duration?.text ?? undefined;

        if (distanceCtrlRef.current) {
          distanceCtrlRef.current.innerText = durText
            ? `Distância: ${dText} • Tempo: ${durText}`
            : `Distância: ${dText}`;
        }

        onDistance?.(dMeters, dText, durText);
      }
    );
  }, [origin, destination, onDistance]);

  return (
    <div
      ref={mapDivRef}
      className="h-80 w-full rounded-2xl overflow-hidden bg-black/10"
    />
  );
}
