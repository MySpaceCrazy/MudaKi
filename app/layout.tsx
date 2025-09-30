import "./globals.css";
import Link from "next/link";

export const metadata = { title: "MudaKi", description: "Sua mudança, do seu jeito" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-br">
      <body>
        <header className="border-b border-white/10">
          <div className="container flex items-center justify-between py-4">
            <Link href="/" className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.jpg" alt="MudaKi" className="h-10 w-10 rounded-full" />
              <span className="font-bold text-xl">MUDAKI</span>
            </Link>
            <nav className="flex gap-4">
              <Link href="/auth" className="btn">Entrar</Link>
            </nav>
          </div>
        </header>
        <main className="container py-10">{children}</main>
        <footer className="container py-10 text-sm text-white/60">© {new Date().getFullYear()} MudaKi</footer>
      </body>
    </html>
  )
}
