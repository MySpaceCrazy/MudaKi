"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

// Carrega o mapa só no cliente
const MapPicker = dynamic(() => import("@/components/MapPicker"), { ssr: false });

type Place = { lat: number; lng: number; address: string };

export default function NewRequest() {
  const router = useRouter();

  const [origin, setOrigin] = useState<Place | null>(null);
  const [destination, setDestination] = useState<Place | null>(null);
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

    if (!origin || !destination || !date) {
      alert("Preencha origem, destino e data.");
      return;
    }

    try {
      const docRef = await addDoc(collection(db, "requests"), {
        userId: user.uid,
        origin,
        destination,
        date,
        helpers,
        items,
        status: "open",
        createdAt: serverTimestamp(),
      });

      alert("Solicitação criada com sucesso!");
      // redireciona (p/ futuro podemos ir para /request/[id])
      router.push("/");
    } catch (err: any) {
      console.error(err);
      alert("Erro ao salvar. Confira suas chaves do Firebase e tente novamente.");
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Nova solicitação</h1>

      <form onSubmit={onSubmit} className="space-y-8">
        {/* ORIGEM */}
        <div>
          <h2 className="font-semibold mb-2">Origem</h2>
          <MapPicker onChange={setOrigin} />
          {origin && (
            <p className="text-sm text-white/70 mt-2">
              {origin.address}
            </p>
          )}
        </div>

        {/* DESTINO */}
        <div>
          <h2 className="font-semibold mb-2">Destino</h2>
          <MapPicker onChange={setDestination} />
          {destination && (
            <p className="text-sm text-white/70 mt-2">
              {destination.address}
            </p>
          )}
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

        <button type="submit" className="btn">Salvar</button>

        <p className="text-white/60 text-sm">
          Após salvar, motoristas verão sua solicitação e poderão enviar propostas.
        </p>
      </form>
    </div>
  );
}
