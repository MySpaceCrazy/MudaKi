"use client";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center text-center space-y-10">
      <div className="bg-neutral-900 p-8 rounded-2xl shadow-md max-w-2xl">
        <h1 className="text-4xl font-bold mb-4">Sua mudança, do seu jeito</h1>
        <p className="text-white/80 mb-6">
          Peça sua mudança com origem e destino no mapa, compare propostas e pague online.
          Inspirado na experiência Uber/99.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/request/new" className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium">
            Criar solicitação
          </Link>
          <Link href="/auth" className="bg-purple-900 hover:bg-purple-800 text-white px-6 py-3 rounded-lg font-medium">
            Sou motorista
          </Link>
        </div>
      </div>

      <div className="bg-neutral-900 p-6 rounded-2xl shadow-md max-w-xl">
        <h2 className="text-2xl font-semibold mb-4">Como funciona?</h2>
        <ol className="text-left list-decimal list-inside space-y-2 text-white/80">
          <li>Cadastre-se como cliente ou motorista</li>
          <li>Crie uma solicitação com origem/destino e itens</li>
          <li>Motoristas enviam propostas (valor, horários, caminhão)</li>
          <li>Escolha, pague e acompanhe sua mudança</li>
        </ol>
      </div>
    </div>
  );
}
