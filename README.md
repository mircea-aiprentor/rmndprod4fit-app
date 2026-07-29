# Panou Antrenor — ElvisPro Cut (FRONTEND)

Interfața frontend (React) pentru ElvisPro Cut: antrenorii se autentifică cu **PIN**, încarcă clipuri brute și primesc **Reels** (9:16) cu subtitrări sincronizate, hook, caption, CTA și hashtags. Backend-ul real (motorul) îl conectezi tu.

> ⚠️ Acest repo conține **DOAR frontend-ul**. Nu există backend inclus (fostul FastAPI demo a fost eliminat). Vezi `INTEGRARE.md` pentru conectarea la stack-ul real.

## Stack real (conectat de tine)
- **Supabase** — bază de date + autentificare pe bază de **PIN** (tabel `trainers`)
- **n8n** — motorul: Claude (script) + AssemblyAI (transcriere) + Shotstack/Creatomate (randare)
- **Cloudflare R2** — stocare video (bucket `reels-clipuri`)
- **Stripe** — 8 linkuri de plată LIVE

## Stack frontend
- React 19 (craco) + Tailwind + shadcn/ui + framer-motion + `@supabase/supabase-js`
- Rulează pe portul `3000`

## Cum funcționează datele
Tot trece printr-un singur strat: **`src/services/elvispro.js`**, cu 2 moduri comutate automat:
- **REAL** — dacă `REACT_APP_SUPABASE_*` e setat: Supabase + n8n
- **DEMO** — dacă nu: `localStorage` + generare simulată (doar ca preview-ul să fie funcțional/testabil)

Pagini conectate la acest strat: **Login** (PIN), **Dashboard** (statistici din reels), **Proiecte** (upload + creare), **Detaliu reel** (generare Prompt/Subtitrare, aprobare, export .SRT), **Abonament** (linkuri Stripe).

## Rulare locală
```bash
git clone https://github.com/<user>/<repo>.git
cd <repo>/frontend
cp .env.example .env      # completează cheile tale (Supabase, n8n)
yarn install
yarn start
```
Deschide 👉 http://localhost:3000 · Sau, din rădăcină: `./start.sh`

## Configurare (`frontend/.env`)
```
REACT_APP_SUPABASE_URL=https://nuhlkersvxkvcvezaypm.supabase.co
REACT_APP_SUPABASE_ANON_KEY=...
REACT_APP_N8N_WEBHOOK_URL=...
REACT_APP_N8N_API_KEY=...
REACT_APP_N8N_API_HEADER=x-api-key
```
Fără aceste chei, aplicația rulează în modul DEMO (login cu PIN `1234`).

## Login
- **PIN** (nu email/parolă). Trainer-ul e păstrat în `localStorage` (`pa_trainer`).
- Demo: PIN `1234`. Real: validat contra tabelului `trainers` (coloana `pin`).

**Detalii complete de integrare + schema Supabase: vezi `INTEGRARE.md`.**
