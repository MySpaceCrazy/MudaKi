"use client";

import { useEffect, useRef, useState } from "react";
import { auth } from "@/lib/firebase";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signInWithPopup,
  GoogleAuthProvider,
  ConfirmationResult,
} from "firebase/auth";

export default function AuthPage() {
  const [phone, setPhone] = useState("");            // ex.: 11988887777 ou +5511988887777
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Evita recriar recaptcha em navegações
  const recaptchaReadyRef = useRef(false);

  useEffect(() => {
    // Garante que o RecaptchaVerifier exista apenas 1x
    if (typeof window === "undefined") return;
    if (recaptchaReadyRef.current) return;

    try {
      // Se já existir em window, reaproveita
      // @ts-ignore
      if (!window.recaptchaVerifier) {
        // @ts-ignore
        window.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha", {
          size: "invisible",
        });
      }
      recaptchaReadyRef.current = true;
    } catch (e) {
      console.error("Erro ao preparar reCAPTCHA:", e);
    }
  }, []);

  function toE164(raw: string) {
    // remove tudo que não for número
    let digits = raw.replace(/\D/g, "");

    // Se não começar com 55 e tiver 10~11 dígitos (BR), prefixa +55
    if (!digits.startsWith("55")) {
      digits = "55" + digits;
    }
    return `+${digits}`;
  }

  async function onSendSms(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMsg(null);

    if (!phone.trim()) {
      setError("Digite seu número de telefone.");
      return;
    }

    const e164 = toE164(phone);

    try {
      setLoading(true);
      // @ts-ignore
      const appVerifier = window.recaptchaVerifier as RecaptchaVerifier;
      const result = (await signInWithPhoneNumber(auth, e164, appVerifier)) as ConfirmationResult;

      // Guardamos para confirmar depois
      // @ts-ignore
      window._confirmationResult = result;
      setCodeSent(true);
      setMsg("SMS enviado! Confira o código no seu telefone.");
    } catch (err: any) {
      console.error(err);
      setError(
        err?.message?.includes("requests are blocked")
          ? "O reCAPTCHA bloqueou a solicitação. Recarregue a página e tente novamente."
          : "Não foi possível enviar o SMS. Verifique o número e tente de novo."
      );
    } finally {
      setLoading(false);
    }
  }

  async function onVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMsg(null);

    if (!code.trim()) {
      setError("Digite o código recebido por SMS.");
      return;
    }

    try {
      setLoading(true);
      // @ts-ignore
      const confirmation: ConfirmationResult = window._confirmationResult;
      const cred = await confirmation.confirm(code);

      setMsg(`Autenticado! Bem-vindo, ${cred.user.phoneNumber ?? "usuário"}.`);
    } catch (err: any) {
      console.error(err);
      setError("Código inválido. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function onGoogle() {
    setError(null);
    setMsg(null);
    try {
      setLoading(true);
      await signInWithPopup(auth, new GoogleAuthProvider());
      setMsg("Autenticado com Google!");
    } catch (err: any) {
      console.error(err);
      setError("Falha no login com Google.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-[70vh] flex flex-col items-center justify-start gap-6 pt-16">
      <h1 className="text-2xl font-semibold">Entrar ou Cadastrar</h1>

      {/* Mensagens */}
      {msg && <p className="text-green-400">{msg}</p>}
      {error && <p className="text-red-400">{error}</p>}

      {/* Form SMS */}
      {!codeSent ? (
        <form onSubmit={onSendSms} className="flex items-center gap-3">
          <input
            type="tel"
            placeholder="DDD + número (ex: 11 98888-7777)"
            className="px-3 py-2 rounded-md border border-white/20 bg-white text-black w-72"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={loading}
          />
          <button
            type="submit"
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "Enviando..." : "Enviar SMS"}
          </button>
        </form>
      ) : (
        <form onSubmit={onVerifyCode} className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Código de 6 dígitos"
            className="px-3 py-2 rounded-md border border-white/20 bg-white text-black w-48 tracking-widest"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            disabled={loading}
          />
          <button
            type="submit"
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "Verificando..." : "Confirmar código"}
          </button>
        </form>
      )}

      {/* Google */}
      <button
        onClick={onGoogle}
        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-60"
        disabled={loading}
      >
        Entrar com Google
      </button>

      {/* Recaptcha invisível */}
      <div id="recaptcha" />
    </main>
  );
}
