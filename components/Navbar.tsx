"use client";
import Image from "next/image";
import Link from "next/link";

export default function Navbar() {
  return (
    <header className="w-full border-b border-white/10 bg-black/90 backdrop-blur-md">
      <div className="container mx-auto flex items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/logo.jpg"
            alt="Logo Mudaki"
            width={40}
            height={40}
            className="rounded-full object-contain"
            priority
          />
          <span className="font-bold text-xl text-white">MUDAKI</span>
        </Link>
        <nav className="flex items-center gap-4">
          <Link href="/auth" className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
            Entrar
          </Link>
        </nav>
      </div>
    </header>
  );
}
