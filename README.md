# Panou Antrenor — ElvisPro Cut

Interfață frontend pentru ElvisPro Cut: antrenorii încarcă clipuri brute și primesc Reels (9:16) cu **subtitrări sincronizate**, hook, caption, CTA și hashtags. Motorul real de procesare este **n8n + alte aplicații** (backend-ul din acest repo folosește un placeholder AI demo pentru dezvoltare).

## Stack
- **Frontend**: React 19 (craco) + Tailwind + shadcn/ui + framer-motion (port `3000`)
- **Backend**: FastAPI + MongoDB (motor) (port `8001`, toate rutele sub `/api`)
- **Integrări**: Claude Sonnet 4.6 (demo), Emergent object storage, Stripe (RON), JWT auth

---

## Rulare locală

### 1. Cerințe
- Node.js 18+ și Yarn (`npm install -g yarn`)
- Python 3.11+
- MongoDB local (sau MongoDB Atlas)
- Git

### 2. Clonează
```bash
git clone https://github.com/<user>/<repo>.git
cd <repo>
```

### 3. Fișiere `.env`
Copiază exemplele și completează valorile (vezi `.env.example`):
```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```
> ⚠️ Fișierele `.env` reale NU sunt în Git. Trebuie completate manual cu cheile tale (Emergent LLM, Stripe).

Pentru local, în `frontend/.env` setează:
```
REACT_APP_BACKEND_URL=http://localhost:8001
```

### 4. Backend
```bash
cd backend
pip install -r requirements.txt
python setup_stripe.py          # (o singură dată) creează planurile Stripe
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### 5. Frontend (alt terminal)
```bash
cd frontend
yarn install
yarn start
```

### 6. Deschide
👉 http://localhost:3000

**Cont demo** (creat automat la pornire): `antrenor@elvisprocut.ro` / `Antrenor2025!`

---

## Funcționalități
- Autentificare email/parolă (JWT) + buton Google (placeholder)
- Upload video (drag & drop, preview, progres)
- **Mod de lucru** ales la upload: `Prompt (aleg eu tema)` sau `Subtitrare (doar transcrie)`
- Rezultate: subtitrări sincronizate read-only, preview burned-in 9:16, export `.SRT`, copiere text; în modul Prompt și hook/caption/CTA/hashtags
- Dashboard: statistici, „Reels-uri rămase", sfat AI, reels recente
- Billing Stripe: Coach 89 / Coach+ 339 / Gym-Studio 799 RON

## API (principale)
- `POST /api/auth/register` · `POST /api/auth/login` · `GET /api/auth/me`
- `POST /api/upload` · `POST /api/projects` (câmp `mode`) · `GET /api/projects`
- `POST /api/projects/{id}/generate-plan?mode=prompt|subtitle`
- `POST /api/projects/{id}/approve`
- `GET /api/dashboard/stats` · `GET /api/plans` · `POST /api/payments/checkout`

## Pasul următor spre producție
Înlocuiește funcția demo `generate_ai_plan` din `backend/server.py` cu apeluri către **webhook-urile tale n8n** (transcriere/subtitrare + script).
