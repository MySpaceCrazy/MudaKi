"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { Loader } from "@googlemaps/js-api-loader";

const MapRoute = dynamic(() => import("@/components/MapRoute"), { ssr: false });

type Place = { lat: number; lng: number; address?: string };
type Suggestion = { description: string; place_id: string };

export default function NewRequest() {
  const router = useRouter();

  // refs dos inputs
  const originInputRef = useRef<HTMLInputElement | null>(null);
  const destInputRef = useRef<HTMLInputElement | null>(null);

  // estados principais
  const [origin, setOrigin] = useState<Place | null>(null);
  const [destination, setDestination] = useState<Place | null>(null);

  // distância/tempo
  const [distanceMeters, setDistanceMeters] = useState<number>(0);
  const [distanceText, setDistanceText] = useState<string>("—");
  const [durationText, setDurationText] = useState<string | undefined>(undefined);

  // formulário extra
  const [date, setDate] = useState<string>("");
  const [helpers, setHelpers] = useState<boolean>(false);
  const [items, setItems] = useState<string>("");

  // infra do autocomplete por serviço
  const servicesRef = useRef<{
    autoSvc: google.maps.places.AutocompleteService | null;
    placesSvc: google.maps.places.PlacesService | null;
    sessionTokenOrigin: google.maps.places.AutocompleteSessionToken | null;
    sessionTokenDest: google.maps.places.AutocompleteSessionToken | null;
    biasLocation: google.maps.LatLng | null;
  }>({
    autoSvc: null,
    placesSvc: null,
    sessionTokenOrigin: null,
    sessionTokenDest: null,
    biasLocation: null,
  });

  const [originSuggestions, setOriginSuggestions] = useState<Suggestion[]>([]);
  const [destSuggestions, setDestSuggestions] = useState<Suggestion[]>([]);
  const [openList, setOpenList] = useState<"origin" | "dest" | null>(null);

  // debounce helper
  const debounce = useMemo(
    () =>
      function <F extends (...args: any[]) => void>(fn: F, ms: number) {
        let t: any;
        return (...args: Parameters<F>) => {
          clearTimeout(t);
          t = setTimeout(() => fn(...args), ms);
        };
      },
    []
  );

  // carrega Google + cria serviços + tenta viés regional
  useEffect(() => {
    (async () => {
      const loader = new Loader({
        apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
        libraries: ["places"],
      });
      await loader.load();

      servicesRef.current.autoSvc = new google.maps.places.AutocompleteService();
      // PlacesService precisa de um "node" dummy
      const dummy = document.createElement("div");
      servicesRef.current.placesSvc = new google.maps.places.PlacesService(dummy);
      servicesRef.current.sessionTokenOrigin =
        new google.maps.places.AutocompleteSessionToken();
      servicesRef.current.sessionTokenDest =
        new google.maps.places.AutocompleteSessionToken();

      // viés por geolocalização (opcional)
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          if (!navigator.geolocation) return reject("Geoloc indisponível");
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 7000,
          });
        });
        servicesRef.current.biasLocation = new google.maps.LatLng(
          pos.coords.latitude,
          pos.coords.longitude
        );
      } catch {
        servicesRef.current.biasLocation = null;
      }
    })();
  }, []);

  // busca previsões (origem/destino) — versão debounced
  const fetchPredictions = debounce(
    (which: "origin" | "dest", input: string) => {
      const svc = servicesRef.current.autoSvc;
      if (!svc || !input.trim()) {
        if (which === "origin") setOriginSuggestions([]);
        else setDestSuggestions([]);
        return;
      }

      const opts: google.maps.places.AutocompletionRequest = {
        input,
        componentRestrictions: { country: ["br"] },
        sessionToken:
          which === "origin"
            ? servicesRef.current.sessionTokenOrigin!
            : servicesRef.current.sessionTokenDest!,
        types: ["address"],
      };

      // aplica viés se houver
      if (servicesRef.current.biasLocation) {
        opts.location = servicesRef.current.biasLocation;
        opts.radius = 20000; // 20 km
      }

      svc.getPlacePredictions(opts, (preds, status) => {
        if (status !== google.maps.places.PlacesServiceStatus.OK || !preds) {
          if (which === "origin") setOriginSuggestions([]);
          else setDestSuggestions([]);
          return;
        }
        const list = preds.map((p) => ({
          description: p.description,
          place_id: p.place_id!,
        }));
        if (which === "origin") setOriginSuggestions(list);
        else setDestSuggestions(list);
      });
    },
    220
  );

  // quando seleciona uma sugestão -> busca detalhes (lat/lng + address)
  async function pickSuggestion(which: "origin" | "dest", s: Suggestion) {
    const places = servicesRef.current.placesSvc;
    if (!places) return;

    const fields: google.maps.places.PlaceDetailsRequest = {
      placeId: s.place_id,
      fields: ["formatted_address", "geometry"],
      sessionToken:
        which === "origin"
          ? servicesRef.current.sessionTokenOrigin!
          : servicesRef.current.sessionTokenDest!,
    };

    places.getDetails(fields, (place, status) => {
      if (status !== google.maps.places.PlacesServiceStatus.OK || !place?.geometry?.location)
        return;

      const addr = place.formatted_address ?? s.description;
      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();

      if (which === "origin") {
        if (originInputRef.current) originInputRef.current.value = addr;
        setOrigin({ lat, lng, address: addr });
        setOriginSuggestions([]);
        setOpenList(null);
        // nova sessão para próximas digitações
        servicesRef.current.sessionTokenOrigin =
          new google.maps.places.AutocompleteSessionToken();
      } else {
        if (destInputRef.current) destInputRef.current.value = addr;
        setDestination({ lat, lng, address: addr });
        setDestSuggestions([]);
        setOpenList(null);
        servicesRef.current.sessionTokenDest =
          new google.maps.places.AutocompleteSessionToken();
      }
    });
  }

  // usar localização atual como origem (preenche input e estado)
  async function useMyLocation() {
    try {
      const coords = await new Promise<GeolocationPosition>((resolve, reject) => {
        if (!navigator.geolocation) return reject(new Error("Geolocalização indisponível"));
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });

      const { latitude, longitude } = coords.coords;

      const loader = new Loader({
        apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
        libraries: ["places"],
      });
      await loader.load();

      const geocoder = new google.maps.Geocoder();
      const res = await geocoder.geocode({ location: { lat: latitude, lng: longitude } });
      const addr = res.results?.[0]?.formatted_address ?? "Minha localização";

      if (originInputRef.current) originInputRef.current.value = addr;
      setOrigin({ lat: latitude, lng: longitude, address: addr });

      // atualiza viés de previsões para a sua área
      servicesRef.current.biasLocation = new google.maps.LatLng(latitude, longitude);
    } catch (err) {
      console.warn("Falha ao obter localização:", err);
      alert("Não foi possível obter sua localização.");
    }
  }

  // salvar
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const user = auth.currentUser;
    if (!user) {
      alert("Faça login para criar a solicitação.");
      router.push("/auth");
      return;
    }
    if (!origin || !destination || !date) {
      alert("Preencha origem, destino e data.");
      return;
    }

    try {
      await addDoc(collection(db, "requests"), {
        userId: user.uid,
        origin,
        destination,
        date,
        helpers,
        items,
        distanceMeters,
        distanceText,
        durationText: durationText ?? null,
        status: "open",
        createdAt: serverTimestamp(),
      });

      alert("Solicitação criada com sucesso!");
      router.push("/");
    } catch (err: any) {
      console.error(err);
      alert("Erro ao salvar. Confira suas chaves do Firebase e tente novamente.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Nova solicitação</h1>

      <form onSubmit={onSubmit} className="space-y-8">
        {/* ORIGEM + botão localização */}
        <div className="relative">
          <div className="grid grid-cols-1 md:grid-cols-[1fr,auto] gap-3 items-stretch">
            <input
              ref={originInputRef}
              type="text"
              placeholder="Origem (digite e selecione)"
              className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 outline-none"
              autoComplete="off"
              onChange={(e) => {
                setOpenList("origin");
                fetchPredictions("origin", e.target.value);
              }}
              onFocus={(e) => {
                if (e.currentTarget.value) {
                  setOpenList("origin");
                  fetchPredictions("origin", e.currentTarget.value);
                }
              }}
            />
            <button
              type="button"
              onClick={useMyLocation}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium"
            >
              Usar localização
            </button>
          </div>

          {/* Dropdown de sugestões de ORIGEM */}
          {openList === "origin" && originSuggestions.length > 0 && (
            <div className="absolute z-20 mt-1 w-full max-w-[calc(100%-0px)] rounded-lg border border-white/10 bg-neutral-900/95 backdrop-blur p-1 shadow-lg">
              {originSuggestions.map((s) => (
                <button
                  key={s.place_id}
                  type="button"
                  className="block w-full text-left px-3 py-2 rounded-md hover:bg-white/5"
                  onClick={() => pickSuggestion("origin", s)}
                >
                  {s.description}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* DESTINO */}
        <div className="relative">
          <input
            ref={destInputRef}
            type="text"
            placeholder="Destino (digite e selecione)"
            className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 outline-none"
            autoComplete="off"
            onChange={(e) => {
              setOpenList("dest");
              fetchPredictions("dest", e.target.value);
            }}
            onFocus={(e) => {
              if (e.currentTarget.value) {
                setOpenList("dest");
                fetchPredictions("dest", e.currentTarget.value);
              }
            }}
          />

          {/* Dropdown de sugestões de DESTINO */}
          {openList === "dest" && destSuggestions.length > 0 && (
            <div className="absolute z-20 mt-1 w-full rounded-lg border border-white/10 bg-neutral-900/95 backdrop-blur p-1 shadow-lg">
              {destSuggestions.map((s) => (
                <button
                  key={s.place_id}
                  type="button"
                  className="block w-full text-left px-3 py-2 rounded-md hover:bg-white/5"
                  onClick={() => pickSuggestion("dest", s)}
                >
                  {s.description}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Mapa/rota */}
        <MapRoute
          origin={origin}
          destination={destination}
          onDistance={(meters, text, duration) => {
            setDistanceMeters(meters);
            setDistanceText(text);
            setDurationText(duration);
          }}
        />

        {/* Resumo */}
        <div className="text-sm text-white/80 space-y-1">
          <p><span className="text-white/50">Origem:</span> {origin?.address ?? "—"}</p>
          <p><span className="text-white/50">Destino:</span> {destination?.address ?? "—"}</p>
          <p>
            <span className="text-white/50">Distância:</span> {distanceText}{" "}
            {durationText ? <span className="text-white/50">• Tempo:</span> : null}{" "}
            {durationText ?? ""}
          </p>
        </div>

        {/* DATA */}
        <div>
          <label htmlFor="date" className="block text-sm mb-1">Data da mudança</label>
          <input
            id="date"
            name="date"
            type="date"
            className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 outline-none"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>

        {/* ITENS */}
        <div>
          <label htmlFor="items" className="block text-sm mb-1">
            Itens (ex.: 1 geladeira, 2 camas, 10 caixas…)
          </label>
          <textarea
            id="items"
            name="items"
            className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 outline-none min-h-[90px]"
            placeholder="Descreva os itens e observações"
            value={items}
            onChange={(e) => setItems(e.target.value)}
          />
        </div>

        {/* AJUDANTES */}
        <div className="flex items-center gap-2">
          <input
            id="helpers"
            name="helpers"
            type="checkbox"
            className="h-4 w-4"
            checked={helpers}
            onChange={(e) => setHelpers(e.target.checked)}
          />
          <label htmlFor="helpers">Precisa de ajudantes</label>
        </div>

        <button
          type="submit"
          className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-lg font-semibold"
        >
          Salvar
        </button>

        <p className="text-white/60 text-sm">
          Após salvar, motoristas verão sua solicitação e poderão enviar propostas.
        </p>
      </form>
    </div>
  );
}
