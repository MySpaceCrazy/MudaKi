"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

// Carrega o mapa apenas no cliente
const MapRoute = dynamic(() => import("@/components/MapRoute"), { ssr: false });

type Place = { lat: number; lng: number; address: string };

export default function NewRequest() {
  const router = useRouter();

  // Estado de localização/rota
  const [origin, setOrigin] = useState<Place | null>(null);
  const [destination, setDestination] = useState<Place | null>(null);
  const [distanceMeters, setDistanceMeters] = useState<number | null>(null);

  // Outros campos do formulário
  const [date, setDate] = useState<string>("");
  const [helpers, setHelpers] = useState<boolean>(false);
  const [items, setItems] = useState<string>("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Precisa estar logado
    const user = auth.currentUser;
    if (!user) {
      alert("Faça login para criar a solicitação.");
      router.push("/auth");
      return;
    }

    // Validação simples
    if (!origin || !destination || !date) {
      alert("Preencha origem, destino e data.");
      return;
    }

    try {
      await addDoc(collection(db, "requests"), {
        userId: user.uid,
        origin,
        destination,
        distanceMeters: distanceMeters ?? null,
        date,
        helpers,
        items,
        status: "open",
        createdAt: serverTimestamp(),
      });

      alert("Solicitação criada com sucesso!");
      router.push("/");
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar. Confira suas chaves do Firebase e tente novamente.");
    }
  };

  const kmText =
    distanceMeters != null ? `${(distanceMeters / 1000).toFixed(1)} km` : "—";

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Nova solicitação</h1>

      <form onSubmit={onSubmit} className="space-y-6">
        {/* Mapa + Autocompletes + Rota */}
        <MapRoute
          onOriginChange={setOrigin}
          onDestinationChange={setDestination}
          onDistanceChange={setDistanceMeters}
        />

        {/* Resumo rápido da seleção */}
        <div className="text-sm text-white/70 space-y-1">
          <div>
            <strong>Origem:</strong> {origin?.address || "—"}
          </div>
          <div>
            <strong>Destino:</strong> {destination?.address || "—"}
          </div>
          <div>
            <strong>Distância:</strong> {kmText}
          </div>
        </div>

        {/* Data da mudança */}
        <div>
          <label htmlFor="date" className="block text-sm mb-1">
            Data da mudança
          </label>
          <input
            id="date"
            type="date"
            className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 outline-none"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>

        {/* Itens/observações */}
        <div>
          <label htmlFor="items" className="block text-sm mb-1">
            Itens (ex.: 1 geladeira, 2 camas, 10 caixas…)
          </label>
          <textarea
            id="items"
            className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 outline-none min-h-[90px]"
            placeholder="Descreva os itens e observações"
            value={items}
            onChange={(e) => setItems(e.target.value)}
          />
        </div>

        {/* Ajudantes */}
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={helpers}
            onChange={(e) => setHelpers(e.target.checked)}
          />
          Precisa de ajudantes
        </label>

        <button type="submit" className="btn">Salvar</button>

        <p className="text-white/60 text-sm">
          Após salvar, motoristas verão sua solicitação e poderão enviar propostas.
        </p>
      </form>
    </div>
  );
}
