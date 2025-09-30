"use client"
import { useState } from "react"
import { auth, RecaptchaVerifier, signInWithPhoneNumber } from "@/lib/firebase"
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth"

export default function AuthPage() {
  const [phone, setPhone] = useState("")
  const [codeSent, setCodeSent] = useState(false)
  const [code, setCode] = useState("")
  const [confirmation, setConfirmation] = useState<any>(null)

  const onSubmitPhone = async (e: React.FormEvent) => {
    e.preventDefault()
    // @ts-ignore
    window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha', { size: 'invisible' })
    const result = await signInWithPhoneNumber(auth, phone, window.recaptchaVerifier)
    setConfirmation(result)
    setCodeSent(true)
  }
  const onVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    await confirmation.confirm(code)
    alert('Autenticado!')
  }
  const onGoogle = async () => {
    await signInWithPopup(auth, new GoogleAuthProvider())
    alert('Autenticado!')
  }
  return (
    <div className="max-w-md mx-auto card">
      <h1 className="text-2xl font-bold mb-4">Entrar ou Cadastrar</h1>
      <div id="recaptcha" />
      {!codeSent ? (
        <form onSubmit={onSubmitPhone} className="space-y-3">
          <input className="input" placeholder="+55DDDNumero" value={phone} onChange={e=>setPhone(e.target.value)} />
          <button className="btn" type="submit">Enviar SMS</button>
        </form>
      ) : (
        <form onSubmit={onVerifyCode} className="space-y-3">
          <input className="input" placeholder="Código SMS" value={code} onChange={e=>setCode(e.target.value)} />
          <button className="btn" type="submit">Confirmar</button>
        </form>
      )}
      <div className="mt-6">
        <button className="btn" onClick={onGoogle}>Entrar com Google</button>
      </div>
    </div>
  )
}
