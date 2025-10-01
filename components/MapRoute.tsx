// components/MapRoute.tsx
"use client";

import {useEffect, useRef, useState} from "react";
import { Loader } from "@googlemaps/js-api-loader";

type LatLng = { lat: number; lng: number };
export type RouteValue = {
  origin: { address: string; location: LatLng } | null;
  destination: { address: string; location: LatLng } | null;
  distanceMeters: number | null; // total em metros
};

export default function MapRoute({
  onChange,
  defaultOrigin,
  defaultDestination,
}: {
  onChange?: (v: RouteValue) => void;
  defaultOrigin?: string;
  defaultDestination?: string;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const originInputRef = useRef<HTMLInputElement>(null);
  const destInputRef = useRef<HTMLInputElement>(null);

  const [state, setState] = useState<RouteValue>({
    origin: null,
    destination: null,
    distanceMeters: null,
  });

  // Helpers para notificar o pai
  function pushChange(patch: Partial<RouteValue>) {
    setState((prev) => {
      const next = { ...prev, ...patch };
      onChange?.(next);
      return next;
    });
  }

  useEffect(() => {
    if (!mapRef.current) return;

    let map: google.maps.Map;
    let directionsService: google.maps.DirectionsService;
    let directionsRenderer: google.maps.DirectionsRenderer;
    let originAutocomplete: google.maps.places.Autocomplete;
    let destAutocomplete: google.maps.places.Autocomplete;
    let geocoder: google.maps.Geocoder;

    let mounted = true;

    async function init() {
      const loader = new Loader({
        apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
        libraries: ["places"],
      });
      await loader.load();

      const { Map } = (await google.maps.importLibrary("maps")) as google.maps.MapsLibrary;
      const { Autocomplete } = (await google.maps.importLibrary("places")) as google.maps.PlacesLibrary;
      const { Geocoder } = (await google.maps.importLibrary("geocoding")) as google.maps.GeocodingLibrary;
      const { DirectionsService, DirectionsRenderer } =
        (await google.maps.importLibrary("routes")) as unknown as {
          DirectionsService: typeof google.maps.DirectionsService;
          DirectionsRenderer: typeof google.maps.DirectionsRenderer;
        };

      if (!mounted) return;

      // Mapa inicial em SP
      const center = { lat: -23.55052, lng: -46.633308 };

      map = new Map(mapRef.current!, {
        center,
        zoom: 12,
        disableDefaultUI: false,
      });

      geocoder = new Geocoder();
      directionsService = new DirectionsService();
      directionsRenderer = new DirectionsRenderer({ map });

      // Autocomplete nos inputs
      if (originInputRef.current) {
        originAutocomplete = new Autocomplete(originInputRef.current, { fields: ["formatted_address", "geometry"] });
        originAutocomplete.addListener("place_changed", () => {
          const place = originAutocomplete.getPlace();
          const loc = place.geometry?.location;
          if (!loc) return;
          pushChange({
            origin: {
              address: place.formatted_address || originInputRef.current!.value,
              location: { lat: loc.lat(), lng: loc.lng() },
            },
          });
          tryRoute();
        });
      }

      if (destInputRef.current) {
        destAutocomplete = new Autocomplete(destInputRef.current, { fields: ["formatted_address", "geometry"] });
        destAutocomplete.addListener("place_changed", () => {
          const place = destAutocomplete.getPlace();
          const loc = place.geometry?.location;
          if (!loc) return;
          pushChange({
            destination: {
              address: place.formatted_address || destInputRef.current!.value,
              location: { lat: loc.lat(), lng: loc.lng() },
            },
          });
          tryRoute();
        });
      }

      // Defaults via texto (opcional)
      if (defaultOrigin && originInputRef.current) {
        originInputRef.current.value = defaultOrigin;
      }
      if (defaultDestination && destInputRef.current) {
        destInputRef.current.value = defaultDestination;
      }

      async function tryRoute() {
        const { origin, destination } = stateRef.current; // usar ref para estado mais recente
        if (!origin || !destination) return;

        const res = await directionsService.route({
          origin: origin.location,
          destination: destination.location,
          travelMode: google.maps.TravelMode.DRIVING,
        });

        directionsRenderer.setDirections(res);

        // soma da distância dos trechos
        const route = res.routes[0];
        const legs = route?.legs || [];
        const meters = legs.reduce((acc, leg) => acc + (leg.distance?.value || 0), 0);

        pushChange({ distanceMeters: meters });
      }

      // manter estado mais novo dentro do closure
      const stateRef = { current: state };
      const unsub = subscribe((s) => {
        stateRef.current = s;
      });

      // Se quiser tentativa de rota ao iniciar quando já há defaults
      setTimeout(async () => {
        if (defaultOrigin && originInputRef.current) {
          const { results } = await geocoder.geocode({ address: defaultOrigin });
          const r = results?.[0];
          if (r?.geometry?.location) {
            pushChange({
              origin: {
                address: r.formatted_address,
                location: { lat: r.geometry.location.lat(), lng: r.geometry.location.lng() },
              },
            });
          }
        }
        if (defaultDestination && destInputRef.current) {
          const { results } = await geocoder.geocode({ address: defaultDestination });
          const r = results?.[0];
          if (r?.geometry?.location) {
            pushChange({
              destination: {
                address: r.formatted_address,
                location: { lat: r.geometry.location.lat(), lng: r.geometry.location.lng() },
              },
            });
          }
        }
      }, 0);

      return () => {
        unsub();
      };
    }

    // simples “pub-sub” local para termos o estado mais atual no tryRoute
    const listeners = new Set<(s: RouteValue) => void>();
    function subscribe(fn: (s: RouteValue) => void) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    }
    function notifyAll(s: RouteValue) {
      listeners.forEach((l) => l(s));
    }

    const stopWatch = () => {};
    init();

    // sempre que state muda, notifica quem quer reagir (p/ tryRoute)
    // (não usa dependency do React aqui, para evitar reconfigurar o mapa)
    const obs = (s: RouteValue) => {};
    listeners.add(obs);
    return () => {
      mounted = false;
      listeners.clear();
      stopWatch();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // notifica subscritos
  useEffect(() => {
    // @ts-ignore – uso local do notify simples
    if (typeof window !== "undefined" && (window as any).__notifyRoute) {
      (window as any).__notifyRoute(state);
    }
  }, [state]);

  // hack simples para expor notify em window
  if (typeof window !== "undefined" && !(window as any).__notifyRoute) {
    (window as any).__notifyRoute = (s: RouteValue) => {};
  }
  const notifyRef = useRef<(s: RouteValue) => void>();
  useEffect(() => {
    const fn = (s: RouteValue) => notifyRef.current?.(s);
    // @ts-ignore
    (window as any).__notifyRoute = fn;
  }, []);

  // handler público para clicar “Usar localização atual”
  async function useMyLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        // reverse geocode
        const loader = new Loader({
          apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
          libraries: ["places"],
        });
        await loader.load();
        const { Geocoder } = (await google.maps.importLibrary("geocoding")) as google.maps.GeocodingLibrary;
        const geocoder = new Geocoder();
        geocoder.geocode({ location: { lat: latitude, lng: longitude } }, (res) => {
          const address = res?.[0]?.formatted_address || "Minha localização";
          pushChange({
            origin: { address, location: { lat: latitude, lng: longitude } },
          });
        });
      },
      () => {
        // silencioso
      }
    );
  }

  const km =
    state.distanceMeters != null
      ? (state.distanceMeters / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 2 })
      : null;

  return (
    <div className="w-full space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="flex items-center gap-2">
          <input
            ref={originInputRef}
            placeholder="Origem (digite e selecione)"
            className="w-full px-3 py-2 rounded-lg border border-white/15 bg-black/30 text-white placeholder-white/40"
          />
          <button
            type="button"
            onClick={useMyLocation}
            className="shrink-0 bg-purple-600 hover:bg-purple-700 px-3 py-2 rounded-lg text-white"
            title="Usar minha localização"
          >
            Usar localização
          </button>
        </div>

        <input
          ref={destInputRef}
          placeholder="Destino (digite e selecione)"
          className="w-full px-3 py-2 rounded-lg border border-white/15 bg-black/30 text-white placeholder-white/40"
        />
      </div>

      {km && (
        <div className="text-sm text-white/80">
          Distância estimada: <span className="font-semibold">{km} km</span>
        </div>
      )}

      <div ref={mapRef} className="h-96 w-full rounded-2xl overflow-hidden bg-black/10" />
    </div>
  );
}
