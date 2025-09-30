# MudaKi — MVP (Next.js + Firebase)

> Web MVP do app de mudanças inspirado na experiência Uber/99.

## Stack
- Next.js (App Router)
- TailwindCSS
- Firebase (Auth, Firestore, Storage)
- Google Maps JavaScript API

## Rodando local
```bash
npm i
cp .env.example .env.local # e preencha as chaves
npm run dev
```

## Deploy na Vercel
- Conecte o repositório.
- Configure as variáveis do `.env` na Vercel (Environment Variables).
- Build command padrão (`next build`).

## Estrutura
```
app/                # páginas (App Router)
components/         # componentes de UI
lib/                # firebase, tipos
public/             # logo
```

## Git & LFS
- Evite arquivos > 100MB. Se necessário, use Git LFS:
```
git lfs install
git lfs track "*.jpg"
```
Adicione também vídeos/imagens grandes no Storage do Firebase.
