"use client"
import { useState } from "react"
import dynamic from "next/dynamic"
const MapPicker = dynamic(()=>import("@/components/MapPicker"), { ssr:false })

export default function NewRequest() {
  const [origin, setOrigin] = useState<any>(null)
  const [destination, setDestination] = useState<any>(null)
  const [date, setDate] = useState<string>("")
  const [helpers, setHelpers] = useState(false)

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Criar solicitação</h1>

      <div className="card space-y-4">
        <div>
          <h2 className="font-semibold mb-2">Origem</h2>
          <MapPicker onChange={setOrigin} />
          {origin && <p className="text-sm text-white/70 mt-2">{origin.address}</p>}
        </div>
        <div>
          <h2 className="font-semibold mb-2">Destino</h2>
          <MapPicker onChange={setDestination} />
          {destination && <p className="text-sm text-white/70 mt-2">{destination.address}</p>}
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block mb-1 text-sm">Data</label>
            <input type="date" className="input" value={date} onChange={e=>setDate(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <input id="helpers" type="checkbox" className="h-4 w-4" checked={helpers} onChange={e=>setHelpers(e.target.checked)} />
            <label htmlFor="helpers">Precisa de ajudantes</label>
          </div>
        </div>
        <button className="btn">Salvar (mock)</button>
        <p className="text-white/60 text-sm">Esta tela é um mock: o botão acima seria conectado ao Firestore.</p>
      </div>
    </div>
  )
}
