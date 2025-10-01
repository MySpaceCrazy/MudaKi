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
  // Estados de UI
  const [phone, setPhone] = useState(""); // ex.: 11 98888-7777, +55 11 98888-7777, etc.
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Evita recriar o reCAPTCHA em navegações dentro do app
  const recaptchaReadyRef = useRef(false);

  useEffect(() => {
    // Garante que o RecaptchaVerifier exista apenas 1x (lado do cliente)
    if (typeof window === "undefined") return;
    if (recaptchaReadyRef.current) return;

    try {
      // Reaproveita se já houver em window
      // @ts-ignore
      if (!window.recaptchaVerifier) {
        // @ts-ignore
        window.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
          size: "invisible",
        });
      }
      recaptchaReadyRef.current = true;
    } catch (e) {
      console.error("Erro ao preparar reCAPTCHA:", e);
    }
  }, []);

  // Converte entradas BR comuns para E.164
  function toE164(raw: string) {
    // remove tudo que não for número
    let digits = raw.replace(/\D/g, "");
    // se não começar com 55 (Brasil), prefixa
    if (!digits.startsWith("55")) digits = "55" + digits;
    return `+${digits}`;
  }

  // Enviar SMS
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

      // Garante que o verificador exista
      // @ts-ignore
      let appVerifier: RecaptchaVerifier = window.recaptchaVerifier;
      // @ts-ignore (fallback se algo limpou o objeto)
      if (!appVerifier) {
        // @ts-ignore
        appVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
          size: "invisible",
        });
        // @ts-ignore
        window.recaptchaVerifier = appVerifier;
      }

      const result = (await signInWithPhoneNumber(
        auth,
        e164,
        appVerifier
      )) as ConfirmationResult;

      // Guarda para confirmar depois
      // @ts-ignore
      window._confirmationResult = result;
      setCodeSent(true);
      setMsg("SMS enviado! Confira o código no seu telefone.");
    } catch (err: any) {
      // 🔎 Log detalhado pro console do browser (ajuda a debugar no Vercel)
      console.error("sendSMS error:", err?.code, err?.message);

      // Tenta resetar o widget invisível se existir
      try {
        // @ts-ignore
        const widgetId = await window.recaptchaVerifier?.render?.();
        // @ts-ignore
        if (typeof window.grecaptcha?.reset === "function") {
          // @ts-ignore
          window.grecaptcha.reset(widgetId);
        }
      } catch {}

      // Mensagens mais amigáveis por código
      let friendly = "Não foi possível enviar o SMS. Verifique o número e tente de novo.";
      switch (err?.code) {
        case "auth/invalid-phone-number":
        case "auth/missing-phone-number":
          friendly = "Número inválido. Revise o DDD e o número (ex.: 11 98888-7777).";
          break;
        case "auth/invalid-app-credential":
          friendly = "Falha no reCAPTCHA. Recarregue a página e tente de novo.";
          break;
        case "auth/too-many-requests":
          friendly = "Muitas tentativas. Aguarde um pouco e tente novamente.";
          break;
        case "auth/quota-exceeded":
          friendly = "Limite de envio de SMS excedido por enquanto. Tente mais tarde.";
          break;
        case "auth/network-request-failed":
          friendly = "Falha de rede. Verifique sua conexão e tente novamente.";
          break;
      }
      setError(friendly);
    } finally {
      setLoading(false);
    }
  }

  // Confirmar código
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
      console.error("confirmCode error:", err?.code, err?.message);
      setError("Código inválido. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  // Google OAuth
  async function onGoogle() {
    setError(null);
    setMsg(null);
    try {
      setLoading(true);
      await signInWithPopup(auth, new GoogleAuthProvider());
      setMsg("Autenticado com Google!");
    } catch (err: any) {
      console.error("googleSignIn error:", err?.code, err?.message);
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
            autoComplete="tel"
            inputMode="tel"
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
            inputMode="numeric"
            autoComplete="one-time-code"
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

      {/* Botão Google */}
      <button
        onClick={onGoogle}
        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-60"
        disabled={loading}
      >
        Entrar com Google
      </button>

      {/* Recaptcha invisível — o ID DEVE bater com o usado no RecaptchaVerifier */}
      <div id="recaptcha-container" />
    </main>
  );
}
