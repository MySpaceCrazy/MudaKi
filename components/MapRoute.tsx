"use client";

import { useEffect, useRef, useState } from "react";
import { Loader } from "@googlemaps/js-api-loader";

type Place = { lat: number; lng: number; address: string };

type Props = {
  onOriginChange: (v: Place | null) => void;
  onDestinationChange: (v: Place | null) => void;
  onDistanceChange?: (meters: number | null) => void;
};

export default function MapRoute({
  onOriginChange,
  onDestinationChange,
  onDistanceChange,
}: Props) {
  // UI
  const [originText, setOriginText] = useState("");
  const [destinationText, setDestinationText] = useState("");

  // Refs de mapa/serviços
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const directionsSvcRef = useRef<google.maps.DirectionsService | null>(null);
  const directionsRef = useRef<google.maps.DirectionsRenderer | null>(null);

  // Markers (ícones auxiliares quando ainda não há rota)
  const originMarkerRef = useRef<google.maps.Marker | null>(null);
  const destinationMarkerRef = useRef<google.maps.Marker | null>(null);

  // Últimos pontos válidos
  const originPointRef = useRef<google.maps.LatLngLiteral | null>(null);
  const destinationPointRef = useRef<google.maps.LatLngLiteral | null>(null);

  // Helpers -------------------------------------------------------------------
  const updateDistanceFromRoute = (result: google.maps.DirectionsResult) => {
    if (!onDistanceChange) return;
    let meters = 0;
    const leg = result.routes?.[0]?.legs?.[0];
    if (leg?.distance?.value != null) {
      meters = leg.distance.value;
    }
    onDistanceChange(meters || null);
  };

  const drawRouteIfPossible = async () => {
    if (!originPointRef.current || !destinationPointRef.current) return;
    if (!directionsSvcRef.current || !directionsRef.current) return;

    const req: google.maps.DirectionsRequest = {
      origin: originPointRef.current,
      destination: destinationPointRef.current,
      travelMode: google.maps.TravelMode.DRIVING,
      provideRouteAlternatives: false,
    };

    directionsSvcRef.current.route(req, (result, status) => {
      if (status === "OK" && result) {
        directionsRef.current!.setDirections(result);
        originMarkerRef.current?.setMap(null);
        destinationMarkerRef.current?.setMap(null);
        updateDistanceFromRoute(result);

        // Ajusta bounds para a rota
        const bounds = new google.maps.LatLngBounds();
        result.routes[0].overview_path.forEach((p) => bounds.extend(p));
        mapRef.current?.fitBounds(bounds);
      }
    });
  };

  const geocodeLatLng = async (latLng: google.maps.LatLngLiteral) =>
    new Promise<string>((resolve) => {
      geocoderRef.current?.geocode({ location: latLng }, (res) => {
        resolve(res?.[0]?.formatted_address ?? "");
      });
    });

  // Inicialização --------------------------------------------------------------
  useEffect(() => {
    let mounted = true;

    (async () => {
      // Evita SSR e garante que o container existe
      if (typeof window === "undefined") return;
      if (!mapDivRef.current) return;

      // 1) Carrega Google Maps
      const loader = new Loader({
        apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
        libraries: ["places"],
      });
      await loader.load();

      const [{ Map }, { Marker }, { Geocoder }, , { Autocomplete }] =
        await Promise.all([
          google.maps.importLibrary("maps") as Promise<google.maps.MapsLibrary>,
          google.maps.importLibrary(
            "marker"
          ) as Promise<google.maps.MarkerLibrary>,
          google.maps.importLibrary(
            "geocoding"
          ) as Promise<google.maps.GeocodingLibrary>,
          google.maps.importLibrary(
            "routes"
          ) as Promise<google.maps.RoutesLibrary>, // apenas para typings
          google.maps.importLibrary(
            "places"
          ) as Promise<google.maps.PlacesLibrary>,
        ]);

      if (!mounted) return;

      geocoderRef.current = new Geocoder();

      // 2) Mapa base  (<<< AQUI o non-null assertion resolve o erro)
      mapRef.current = new Map(mapDivRef.current!, {
        center: { lat: -23.55052, lng: -46.633308 }, // SP fallback
        zoom: 12,
        disableDefaultUI: false,
      });

      // 3) Services de rota
      directionsSvcRef.current = new google.maps.DirectionsService();
      directionsRef.current = new google.maps.DirectionsRenderer({
        map: mapRef.current!,
        suppressMarkers: true, // usaremos nossos markers
      });

      // 4) Autocomplete (origem/destino)
      const originInput = document.getElementById(
        "origin-input"
      ) as HTMLInputElement | null;
      const destInput = document.getElementById(
        "destination-input"
      ) as HTMLInputElement | null;

      const originAC =
        originInput && new Autocomplete(originInput, { fields: ["geometry", "formatted_address"] });
      const destAC =
        destInput && new Autocomplete(destInput, { fields: ["geometry", "formatted_address"] });

      originAC?.addListener("place_changed", async () => {
        const place = originAC.getPlace();
        const loc = place?.geometry?.location;
        if (!loc) return;

        const point = { lat: loc.lat(), lng: loc.lng() };
        originPointRef.current = point;
        const addr = place.formatted_address || (await geocodeLatLng(point));
        setOriginText(addr);
        onOriginChange({ ...point, address: addr });

        // mostra marker de origem enquanto não tiver rota
        originMarkerRef.current?.setMap(null);
        originMarkerRef.current = new Marker({
          map: mapRef.current!,
          position: point,
          label: "A",
        });

        drawRouteIfPossible();
      });

      destAC?.addListener("place_changed", async () => {
        const place = destAC.getPlace();
        const loc = place?.geometry?.location;
        if (!loc) return;

        const point = { lat: loc.lat(), lng: loc.lng() };
        destinationPointRef.current = point;
        const addr = place.formatted_address || (await geocodeLatLng(point));
        setDestinationText(addr);
        onDestinationChange({ ...point, address: addr });

        destinationMarkerRef.current?.setMap(null);
        destinationMarkerRef.current = new Marker({
          map: mapRef.current!,
          position: point,
          label: "B",
        });

        drawRouteIfPossible();
      });

      // 5) Click no mapa para preencher origem/destino em sequência
      mapRef.current.addListener("click", async (e: google.maps.MapMouseEvent) => {
        const latLng = e.latLng;
        if (!latLng) return;
        const point = { lat: latLng.lat(), lng: latLng.lng() };

        // Se não tem origem -> define origem; senão define destino
        if (!originPointRef.current) {
          originPointRef.current = point;
          const addr = await geocodeLatLng(point);
          setOriginText(addr);
          onOriginChange({ ...point, address: addr });

          originMarkerRef.current?.setMap(null);
          originMarkerRef.current = new Marker({
            map: mapRef.current!,
            position: point,
            label: "A",
          });
        } else {
          destinationPointRef.current = point;
          const addr = await geocodeLatLng(point);
          setDestinationText(addr);
          onDestinationChange({ ...point, address: addr });

          destinationMarkerRef.current?.setMap(null);
          destinationMarkerRef.current = new Marker({
            map: mapRef.current!,
            position: point,
            label: "B",
          });
        }

        drawRouteIfPossible();
      });
    })();

    return () => {
      mounted = false;
    };
  }, [onOriginChange, onDestinationChange, onDistanceChange]);

  // Geolocalização para origem
  const handleUseMyLocation = () => {
    if (!navigator.geolocation || !mapRef.current) return;
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const point = { lat: coords.latitude, lng: coords.longitude };
        const addr = await geocodeLatLng(point);
        setOriginText(addr);
        onOriginChange({ ...point, address: addr });

        originPointRef.current = point;
        originMarkerRef.current?.setMap(null);
        originMarkerRef.current = new google.maps.Marker({
          map: mapRef.current!,
          position: point,
          label: "A",
        });

        // centraliza no usuário
        mapRef.current!.setCenter(point);
        mapRef.current!.setZoom(14);

        // tenta desenhar rota caso já exista destino
        drawRouteIfPossible();
      },
      () => {
        // ignore errors silently
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  return (
    <div className="space-y-3">
      {/* Inputs */}
      <div className="flex flex-col md:flex-row gap-2">
        <input
          id="origin-input"
          className="flex-1 bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 outline-none"
          placeholder="Origem (digite e selecione)"
          value={originText}
          onChange={(e) => setOriginText(e.target.value)}
        />
        <button
          type="button"
          onClick={handleUseMyLocation}
          className="px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white"
        >
          Usar localização
        </button>
      </div>

      <input
        id="destination-input"
        className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 outline-none"
        placeholder="Destino (digite e selecione)"
        value={destinationText}
        onChange={(e) => setDestinationText(e.target.value)}
      />

      {/* Mapa */}
      <div
        ref={mapDivRef}
        className="h-96 w-full rounded-2xl overflow-hidden bg-black/10"
      />
    </div>
  );
}
