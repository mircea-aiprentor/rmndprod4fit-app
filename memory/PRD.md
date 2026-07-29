# PRD — Panou Antrenor (ElvisPro Cut)

## Ce este
Interfață FRONTEND pentru aplicația ElvisPro Cut (elvisprocut.ro): antrenorii încarcă clipuri brute și primesc Reels (9:16) cu subtitrări, hook, caption, CTA, hashtags. Motorul real de procesare este n8n + alte aplicații (NU este construit aici — acest proiect e doar interfața + un backend demo care simulează motorul).

## Constatare audit inițial
Repo-ul GitHub conectat conținea DOAR boilerplate-ul Emergent (fără app real). Confirmat de user → construit de la zero, păstrând identitatea brandului.

## Tech / Arhitectură
- Frontend: React 19 (craco), Tailwind, shadcn/ui, framer-motion, sonner, lucide. Temă dark „Performance Pro" (font Sora headings + Inter body, accent verde-neon #C4F601). Logo real ElvisPro Cut (/logo.jpeg).
- Backend: FastAPI + MongoDB (motor). JWT Bearer (localStorage `pa_token`).
- Integrări: Claude Sonnet 4.6 (Emergent LLM key) ca motor demo; Emergent object storage (video); Stripe subscriptions (claimable sandbox, RON).

## Funcționalități implementate (iunie 2026)
- Auth email/parolă (JWT), cont demo seed.
- Proiecte: upload video (drag & drop, preview, progres), CRUD.
- Mod de lucru „Ce vrei să faci?": **Prompt (aleg eu tema)** → script complet reel; **Subtitrare (doar transcrie)** → doar subtitrări sincronizate. Selectorul e un buton; procesarea reală = n8n.
- Rezultate read-only: subtitrări sincronizate (badge timp), previzualizare burned-in pe preview 9:16, export .SRT + copiere; în modul Prompt și hook/caption/CTA/hashtags/tăieturi.
- Workflow timeline (Upload → Procesare → Review → Aprobare → Export) + animație pași AI.
- Dashboard: 4 statistici (animate), widget abonament cu „Reels-uri rămase" (fără stocare), sfat AI, reels recente.
- Billing: 3 planuri Stripe (Coach 89 / Coach+ 339 / Gym-Studio 799 RON), checkout, webhook, payment-success.
- Responsive (sidebar desktop / drawer mobil). Erori clare (toast) în română.

## Testare
- iteration_1: 17/17 backend + frontend ✅
- iteration_2 (redesign, font, logo): backend 17/17 + frontend ✅
- iteration_3 (mode selector + widget): backend 19/19 + frontend ✅

## Backlog / Faza 2
- Google login real (acum buton „în curând").
- Conectare reală la n8n webhooks (înlocuiește backend-ul demo Claude).
- Procesare video server-side reală (crop 9:16, subtitrări arse).
- Funcții dashboard propuse: management clienți, calendar, analytics, notificări, șabloane.
- Portal facturare Stripe, forgot/reset password UI.

## Credențiale
Vezi /app/memory/test_credentials.md (demo: antrenor@elvisprocut.ro / Antrenor2025!).

## Update (integrare stack real — iulie 2026)
User a clarificat: vrea DOAR frontend-ul; backend-ul real (Supabase + n8n + Shotstack + R2 + Stripe) îl conectează singur (are cont n8n de test cu aceeași structură ca live).
Livrat:
- `src/config/integration.js` — punct central: Supabase URL/anon, n8n webhook + Reel API Key, payload builder, 8 linkuri Stripe LIVE.
- `src/lib/supabaseClient.js` + `src/services/elvispro.js` — funcții gata de folosit (loginWithPin, listReels, getReel, createReel, triggerGeneration, pollReelStatus, listPlans, uploadVideo).
- `Billing.jsx` rescris → folosește linkurile Stripe reale (8 tiere).
- `INTEGRARE.md` — ghid complet de mapare UI→Supabase/n8n/Stripe + tabele + flux Generează.
- `.env.example` actualizat cu REACT_APP_SUPABASE_* și REACT_APP_N8N_*.
Preview rulează în continuare pe backend-ul DEMO (FastAPI) pt. testare; comutarea pe Supabase/n8n se face din .env + servicii.

## Update (login PIN — iulie 2026)
- Login convertit din email/parolă în **PIN** (keypad numeric), folosind `loginWithPin` din `src/services/elvispro.js`.
- Fallback DEMO în preview (fără Supabase): PIN `1234` → trainer „Elvis Antrenor" (Coach +). În producție validează contra tabelului `trainers` (coloana `pin`).
- AuthContext: trainer în localStorage `pa_trainer`, fără apeluri backend. Register eliminat.
- Testat frontend-only: 8/8 scenarii PASS (iteration_1).
