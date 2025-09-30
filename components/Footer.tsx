export default function Footer() {
  return (
    <footer className="w-full text-center py-6 border-t border-white/10 mt-10 text-white/60 text-sm">
      © {new Date().getFullYear()} <span className="font-semibold">MudaKi</span> — Sua mudança, do seu jeito.
    </footer>
  );
}
