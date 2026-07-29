# INTEGRARE — Panou Antrenor (frontend) ↔ backend-ul TĂU

Acest repo conține **DOAR frontend-ul** (React). Nu există backend inclus (fostul FastAPI demo a fost eliminat).
Backend-ul real îl conectezi tu: **Supabase** (date + auth PIN) · **n8n** (motor: Claude + AssemblyAI + Shotstack/Creatomate) · **Cloudflare R2** (video) · **Stripe** (linkuri de plată).

## Cum funcționează acum (starea reală)
Tot fluxul de date trece printr-un singur strat de servicii: **`src/services/elvispro.js`**, care are 2 moduri, comutate automat:
- **REAL** — dacă `REACT_APP_SUPABASE_URL` + `ANON_KEY` sunt setate în `.env`: citește/scrie în Supabase, iar „Generează" apelează webhook-ul n8n.
- **DEMO** — dacă Supabase NU e configurat: date în `localStorage` + generare simulată (folosit doar ca UI-ul să fie testabil fără backend).

**Autentificarea** este pe bază de **PIN** (`loginWithPin`), NU email/parolă. Trainer-ul autentificat e păstrat în `localStorage` (`pa_trainer`).

---

## 1. Ce completezi în `frontend/.env`
```
REACT_APP_SUPABASE_URL=https://nuhlkersvxkvcvezaypm.supabase.co
REACT_APP_SUPABASE_ANON_KEY=sb_publishable__...
REACT_APP_N8N_WEBHOOK_URL=https://<contul-tau>.app.n8n.cloud/webhook/<id>
REACT_APP_N8N_API_KEY=<Reel API Key>
REACT_APP_N8N_API_HEADER=x-api-key
```
Toate se citesc în `src/config/integration.js`. Când setezi cheile, aplicația trece automat pe modul REAL.

## 2. Fișiere cheie de integrare
| Fișier | Rol |
|--------|-----|
| `src/config/integration.js` | URL-uri/chei + payload n8n + cele 8 linkuri Stripe |
| `src/lib/supabaseClient.js` | Clientul Supabase (activ dacă .env e completat) |
| `src/services/elvispro.js` | Toate operațiile de date (vezi mai jos) |

## 3. Funcțiile din `elvispro.js` (deja folosite de pagini)
| Funcție | Folosită în | Ce face în modul REAL |
|---------|-------------|------------------------|
| `loginWithPin(pin)` | `Login.jsx` | `select` din `trainers` după `pin` |
| `listReels(trainerId)` | `Dashboard.jsx`, `Projects.jsx` | `select * from reels where trainerId` |
| `getReel(id)` | `ProjectDetail.jsx` | `select` un reel |
| `uploadVideo(file, trainerId)` | `Projects.jsx` | **TODO: conectează R2/Storage** (întoarce `video_url`) |
| `createReel({...})` | `Projects.jsx` | `insert` în `reels` (status `uploaded`) |
| `runGeneration({reel, mode})` | `ProjectDetail.jsx` | update status→`processing`, `POST` la n8n, apoi `pollReelStatus` |
| `approveReel(id)` | `ProjectDetail.jsx` | update status→`approved` |
| `deleteReel(id)` | `ProjectDetail.jsx` | `delete` din `reels` |
| `computeStats(reels, plan)` | `Dashboard.jsx` | statistici calculate client-side |

## 4. Schema Supabase (confirmată)
```
trainers(id, name, plan, pin)
reels(id, trainerId, title, theme, notes, filename, size, mode, status,
      video_url, caption, hashtags[jsonb], subtitles, subtitle_segments[jsonb],
      hook, cta, music_theme, suggested_cuts[jsonb], created_at)
plans(id, name, price, stripe_price_id)
```
Maparea Supabase → forma din UI se face în funcția **`fromSupabaseReel`** din `elvispro.js` (deja aliniată cu aceste coloane).
> RLS este activ — asigură-te că ai policy care permite `select` pe `trainers` după `pin` cu anon key (sau folosește un RPC de login).

## 5. Fluxul „Generează" (modul REAL)
1. `createReel(...)` → rând nou în `reels` (status `uploaded`)
2. `runGeneration({reel, mode})` → status `processing` + `POST` la webhook n8n (header `x-api-key`), payload din `buildN8nPayload`
3. n8n: Claude/AssemblyAI → Shotstack render → callback `/webhook/shotstack-callback` → scrie `video_url`, `caption`, `subtitle_segments`, status `review`/`done` în `reels`
4. `pollReelStatus(reelId)` afișează rezultatul când e gata

## 6. Stripe — linkuri LIVE (deja montate)
Cele 8 tiere sunt în `STRIPE_PLANS` (`integration.js`). Butonul „Abonează-te" deschide `buy.stripe.com`. Pentru gestionarea abonamentului activează **Customer Portal** în Stripe.

## 7. Upload în R2 (de conectat)
Bucket: `reels-clipuri` · public: `https://pub-8579a74d7311421886bce872c1094073.r2.dev`
Implementează `uploadVideo()` în `elvispro.js` (presigned URL R2 sau Supabase Storage) ca să întoarcă `video_url` public.
