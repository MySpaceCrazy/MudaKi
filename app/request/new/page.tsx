"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { Loader } from "@googlemaps/js-api-loader";

// Carrega o mapa de rota só no cliente
const MapRoute = dynamic(() => import("@/components/MapRoute"), { ssr: false });

type Place = { lat: number; lng: number; address?: string };

export default function NewRequest() {
  const router = useRouter();

  // Autocomplete inputs
  const originInputRef = useRef<HTMLInputElement | null>(null);
  const destInputRef = useRef<HTMLInputElement | null>(null);

  // Estados principais
  const [origin, setOrigin] = useState<Place | null>(null);
  const [destination, setDestination] = useState<Place | null>(null);

  // Distância/tempo calculados pela rota
  const [distanceMeters, setDistanceMeters] = useState<number>(0);
  const [distanceText, setDistanceText] = useState<string>("—");
  const [durationText, setDurationText] = useState<string | undefined>(undefined);

  // Demais campos
  const [date, setDate] = useState<string>("");
  const [helpers, setHelpers] = useState<boolean>(false);
  const [items, setItems] = useState<string>("");

  // Inicializa Google Places Autocomplete nos inputs
  useEffect(() => {
    (async () => {
      // Garante que a API está disponível (idempotente se já estiver carregada)
      const loader = new Loader({
        apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
        libraries: ["places"],
      });
      await loader.load();

      // Autocomplete Origem
      if (originInputRef.current) {
        const ac = new google.maps.places.Autocomplete(originInputRef.current, {
          fields: ["formatted_address", "geometry"],
          types: ["geocode"],
        });
        ac.addListener("place_changed", () => {
          const p = ac.getPlace();
          const loc = p?.geometry?.location;
          if (!loc) return;
          const addr = p.formatted_address ?? originInputRef.current!.value;
          setOrigin({ lat: loc.lat(), lng: loc.lng(), address: addr });
        });
      }

      // Autocomplete Destino
      if (destInputRef.current) {
        const ac = new google.maps.places.Autocomplete(destInputRef.current, {
          fields: ["formatted_address", "geometry"],
          types: ["geocode"],
        });
        ac.addListener("place_changed", () => {
          const p = ac.getPlace();
          const loc = p?.geometry?.location;
          if (!loc) return;
          const addr = p.formatted_address ?? destInputRef.current!.value;
          setDestination({ lat: loc.lat(), lng: loc.lng(), address: addr });
        });
      }
    })();
  }, []);

  // Usar localização atual na ORIGEM
  async function useMyLocation() {
    try {
      // Pede permissão e pega coords
      const coords = await new Promise<GeolocationPosition>((resolve, reject) => {
        if (!navigator.geolocation) return reject(new Error("Geolocalização indisponível"));
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });

      const { latitude, longitude } = coords.coords;

      // Reverso para endereço
      const loader = new Loader({
        apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
        libraries: ["places"],
      });
      await loader.load();

      const geocoder = new google.maps.Geocoder();
      const res = await geocoder.geocode({ location: { lat: latitude, lng: longitude } });
      const addr = res.results?.[0]?.formatted_address ?? "Minha localização";

      // Preenche input e state
      if (originInputRef.current) originInputRef.current.value = addr;
      setOrigin({ lat: latitude, lng: longitude, address: addr });
    } catch (err) {
      console.warn("Falha ao obter localização:", err);
      alert("Não foi possível obter sua localização.");
    }
  }

  // Submit para Firestore
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Precisa estar logado
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
        {/* Linha de inputs: origem e destino */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr,auto] gap-3 items-stretch">
          <input
            ref={originInputRef}
            type="text"
            placeholder="Origem (digite e selecione)"
            className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 outline-none"
            autoComplete="off"
          />
          <button
            type="button"
            onClick={useMyLocation}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium"
          >
            Usar localização
          </button>
        </div>

        <input
          ref={destInputRef}
          type="text"
          placeholder="Destino (digite e selecione)"
          className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 outline-none"
          autoComplete="off"
        />

        {/* Mapa com rota + badge de distância/tempo */}
        <MapRoute
          origin={origin}
          destination={destination}
          onDistance={(meters, text, duration) => {
            setDistanceMeters(meters);
            setDistanceText(text);
            setDurationText(duration);
          }}
        />

        {/* Endereços confirmados e distância */}
        <div className="text-sm text-white/80 space-y-1">
          <p>
            <span className="text-white/50">Origem:</span>{" "}
            {origin?.address ?? "—"}
          </p>
          <p>
            <span className="text-white/50">Destino:</span>{" "}
            {destination?.address ?? "—"}
          </p>
          <p>
            <span className="text-white/50">Distância:</span>{" "}
            {distanceText}{" "}
            {durationText ? <span className="text-white/50">• Tempo:</span> : null}{" "}
            {durationText ?? ""}
          </p>
        </div>

        {/* DATA */}
        <div>
          <label htmlFor="date" className="block text-sm mb-1">
            Data da mudança
          </label>
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

        <button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-lg font-semibold">
          Salvar
        </button>

        <p className="text-white/60 text-sm">
          Após salvar, motoristas verão sua solicitação e poderão enviar propostas.
        </p>
      </form>
    </div>
  );
}
