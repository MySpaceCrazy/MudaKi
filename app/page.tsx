import Link from "next/link"

export default function Home() {
  return (
    <div className="grid md:grid-cols-2 gap-8 items-center">
      <div className="card">
        <h1 className="text-4xl font-extrabold mb-4">Sua mudança, do seu jeito</h1>
        <p className="mb-6">Peça sua mudança com origem e destino no mapa, compare propostas e pague online. Inspirado na experiência Uber/99.</p>
        <div className="flex gap-3">
          <Link href="/request/new" className="btn">Criar solicitação</Link>
          <Link href="/auth" className="btn bg-white/10 hover:bg-white/20">Sou motorista</Link>
        </div>
      </div>
      <div className="card">
        <h2 className="text-2xl font-bold mb-4">Como funciona?</h2>
        <ol className="list-decimal list-inside space-y-2 text-white/80">
          <li>Cadastre-se como cliente ou motorista</li>
          <li>Cliente cria a solicitação com origem/destino e itens</li>
          <li>Motoristas enviam propostas (valor, horários, caminhão)</li>
          <li>Cliente escolhe, paga e acompanha</li>
        </ol>
      </div>
    </div>
  )
}
