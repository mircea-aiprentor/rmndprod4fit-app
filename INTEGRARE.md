# INTEGRARE — Panou Antrenor (frontend) ↔ backend-ul TĂU

Acest frontend a fost livrat **gata de conectat** la stack-ul tău real:
**Supabase** (date + auth PIN) · **n8n** (motor: Claude + AssemblyAI + Shotstack/Creatomate) · **Cloudflare R2** (video) · **Stripe** (linkuri de plată).

> În preview, frontend-ul rulează pe un backend DEMO (FastAPI). Tu îl comuți pe backend-ul tău completând `.env` și folosind stratul de servicii `src/services/elvispro.js`.

---

## 1. Ce completezi în `frontend/.env`
```
REACT_APP_SUPABASE_URL=https://gwidkhnqjqsqtkbxobvx.supabase.co
REACT_APP_SUPABASE_ANON_KEY=sb_publishable__...
REACT_APP_N8N_WEBHOOK_URL=https://<contul-tau>.app.n8n.cloud/webhook/<id>
REACT_APP_N8N_API_KEY=<Reel API Key>
REACT_APP_N8N_API_HEADER=x-api-key
```
Toate se citesc în `src/config/integration.js`.

## 2. Fișiere cheie de integrare
| Fișier | Rol |
|--------|-----|
| `src/config/integration.js` | Toate URL-urile/cheile + payload n8n + linkurile Stripe |
| `src/lib/supabaseClient.js` | Clientul Supabase (activ dacă .env e completat) |
| `src/services/elvispro.js` | Funcții gata de folosit: `loginWithPin`, `listReels`, `getReel`, `createReel`, `triggerGeneration`, `pollReelStatus`, `listPlans`, `uploadVideo` |

## 3. Maparea acțiunilor UI → backend-ul tău
| Acțiune în UI | Fișier UI | Înlocuiește apelul demo cu |
|---------------|-----------|-----------------------------|
| Login PIN | `src/pages/Login.jsx` | `loginWithPin(pin)` → salvează `trainer` în context |
| Listă reels | `src/pages/Dashboard.jsx`, `Projects.jsx` | `listReels(trainer.id)` |
| Detaliu reel | `src/pages/ProjectDetail.jsx` | `getReel(id)` + `pollReelStatus(id)` |
| Upload video | `src/pages/Projects.jsx` (UploadModal) | `uploadVideo(file)` → R2, apoi `createReel({...})` |
| Buton „Generează" (Prompt/Subtitrare) | `src/pages/ProjectDetail.jsx` | `triggerGeneration({ mode, trainerId, reelId, videoUrl, title, theme, notes })` |
| Abonamente | `src/pages/Billing.jsx` | deja folosește linkurile Stripe LIVE din `integration.js` ✅ |

## 4. Tabele Supabase presupuse (din documentația ta)
```
trainers(id, name, plan, pin)
reels(id, trainerId, title, status, caption, hashtags, video_url, duration_seconds, mode, created_at)
plans(id, name, price, stripe_price_id)
```
> RLS este activ — asigură-te că ai policy care permite `select` pe `trainers` după `pin` cu anon key (sau folosește un RPC dedicat pentru login).

## 5. Fluxul „Generează"
1. Frontend: `createReel(...)` → rând nou în `reels` (status `uploaded`)
2. Frontend: `triggerGeneration(...)` → `POST` la webhook n8n cu header `x-api-key`
3. n8n: Claude/AssemblyAI → Shotstack render → callback `/webhook/shotstack-callback` → scrie `video_url` + `status='done'` în `reels`
4. Frontend: `pollReelStatus(reelId)` afișează rezultatul când e gata

## 6. Stripe — linkuri LIVE (deja montate)
Cele 8 tiere din `PLATI-LINKURI-STRIPE-...md` sunt în `STRIPE_PLANS` (`integration.js`). Butonul „Abonează-te" deschide `buy.stripe.com`. Pentru „Manage subscription" activează **Customer Portal** în Stripe și adaugă URL-ul.

## 7. Upload în R2
Bucket: `reels-clipuri` · public: `https://pub-8579a74d7311421886bce872c1094073.r2.dev`
Implementează `uploadVideo()` în `elvispro.js` (presigned URL R2 sau Supabase Storage).
