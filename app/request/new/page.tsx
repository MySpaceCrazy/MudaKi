// app/request/new/page.tsx
"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

// Carrega o componente do mapa só no cliente
const MapRoute = dynamic(() => import("@/components/MapRoute"), { ssr: false });
// Tipagem do valor emitido pelo MapRoute
import type { RouteValue } from "@/components/MapRoute";

type Place = { lat: number; lng: number; address: string };

export default function NewRequest() {
  const router = useRouter();

  // Estado emitido pelo MapRoute
  const [route, setRoute] = useState<RouteValue>({
    origin: null,
    destination: null,
    distanceMeters: null,
  });

  // Demais campos do formulário
  const [date, setDate] = useState<string>("");
  const [helpers, setHelpers] = useState<boolean>(false);
  const [items, setItems] = useState<string>("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Requer login
    const user = auth.currentUser;
    if (!user) {
      alert("Faça login para criar a solicitação.");
      router.push("/auth");
      return;
    }

    // Validações mínimas
    if (!route.origin || !route.destination) {
      alert("Preencha origem e destino (use os campos acima do mapa).");
      return;
    }
    if (!date) {
      alert("Preencha a data da mudança.");
      return;
    }

    try {
      await addDoc(collection(db, "requests"), {
        userId: user.uid,
        // Guarda estrutura simplificada (igual à que você já usa)
        origin: {
          address: route.origin.address,
          lat: route.origin.location.lat,
          lng: route.origin.location.lng,
        } as Place,
        destination: {
          address: route.destination.address,
          lat: route.destination.location.lat,
          lng: route.destination.location.lng,
        } as Place,
        // distância total em metros + km como string para facilitar uso em listas
        distanceMeters: route.distanceMeters ?? null,
        distanceKm:
          route.distanceMeters != null
            ? +(route.distanceMeters / 1000).toFixed(2)
            : null,

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
  }

  const distanceKm =
    route.distanceMeters != null
      ? (route.distanceMeters / 1000).toLocaleString("pt-BR", {
          maximumFractionDigits: 2,
        })
      : null;

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Nova solicitação</h1>

      <form onSubmit={onSubmit} className="space-y-8">
        {/* MAPA ÚNICO: Origem/Destino + rota + distância */}
        <div className="space-y-3">
          <MapRoute onChange={setRoute} />

          <div className="text-sm text-white/70 space-y-1">
            <div>
              <span className="text-white/50">Origem:</span>{" "}
              {route.origin?.address ?? "—"}
            </div>
            <div>
              <span className="text-white/50">Destino:</span>{" "}
              {route.destination?.address ?? "—"}
            </div>
            <div>
              <span className="text-white/50">Distância:</span>{" "}
              {distanceKm ? `${distanceKm} km` : "—"}
            </div>
          </div>
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

        <button type="submit" className="btn">
          Salvar
        </button>

        <p className="text-white/60 text-sm">
          Após salvar, motoristas verão sua solicitação e poderão enviar propostas.
        </p>
      </form>
    </div>
  );
}
