# Panou Antrenor — ElvisPro Cut (FRONTEND)

Interfața frontend (React) pentru ElvisPro Cut. Backend-ul real îl conectezi tu:
**Supabase** (date + auth PIN) · **n8n** (motor: Claude + AssemblyAI + Shotstack/Creatomate) · **Cloudflare R2** (video) · **Stripe** (linkuri de plată).

> Acest repo conține **DOAR frontend-ul**. Nu există backend inclus — vezi `INTEGRARE.md` pentru cum îl legi la stack-ul tău.

## Stack
- React 19 (craco) + Tailwind + shadcn/ui + framer-motion + `@supabase/supabase-js`
- Rulează pe portul `3000`

## Rulare locală
```bash
git clone https://github.com/<user>/<repo>.git
cd <repo>/frontend
cp .env.example .env      # completează cheile tale (Supabase, n8n)
yarn install
yarn start
```
Deschide 👉 http://localhost:3000

Sau, din rădăcina proiectului: `./start.sh`

## Configurare (`frontend/.env`)
```
REACT_APP_SUPABASE_URL=...
REACT_APP_SUPABASE_ANON_KEY=...
REACT_APP_N8N_WEBHOOK_URL=...
REACT_APP_N8N_API_KEY=...
REACT_APP_N8N_API_HEADER=x-api-key
```

## Fișiere cheie de integrare
| Fișier | Rol |
|--------|-----|
| `src/config/integration.js` | URL-uri/chei + payload n8n + linkuri Stripe |
| `src/lib/supabaseClient.js` | Clientul Supabase |
| `src/services/elvispro.js` | Funcții: loginWithPin, listReels, getReel, createReel, triggerGeneration, pollReelStatus, listPlans, uploadVideo |

## Ecrane
- Login · Dashboard · Proiecte Reels (upload + mod Prompt/Subtitrare) · Detaliu reel (rezultat + export .SRT) · Abonament (linkuri Stripe LIVE)

**Detalii complete de integrare: vezi `INTEGRARE.md`.**
