export default function Footer() {
  return (
    <footer className="w-full border-t border-white/10 mt-16">
      <div className="container mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-white/70">
        <p>
          © {new Date().getFullYear()} <span className="font-semibold">MudaKi</span> — Sua mudança, do seu jeito.
        </p>

        <nav className="flex items-center gap-4">
          <a
            href="/privacidade.html"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white underline-offset-4 hover:underline"
          >
            Política de Privacidade
          </a>
          <a
            href="/termos.html"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white underline-offset-4 hover:underline"
          >
            Termos de Uso
          </a>
        </nav>
      </div>
    </footer>
  );
}

