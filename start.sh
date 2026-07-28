#!/usr/bin/env bash
# Panou Antrenor — pornire rapidă locală (backend + frontend)
# Utilizare: ./start.sh
set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

echo "==> Verific fișierele .env"
if [ ! -f backend/.env ]; then
  echo "   ! Lipsește backend/.env — copiez din exemplu (completează cheile!)"
  cp backend/.env.example backend/.env
fi
if [ ! -f frontend/.env ]; then
  echo "   ! Lipsește frontend/.env — copiez din exemplu"
  cp frontend/.env.example frontend/.env
fi

echo "==> Instalez dependențele backend"
cd "$ROOT/backend"
pip install -q -r requirements.txt

echo "==> Configurez planurile Stripe (idempotent)"
python setup_stripe.py || echo "   (sar peste setup_stripe — verifică cheile Stripe)"

echo "==> Pornesc backend pe http://localhost:8001"
uvicorn server:app --host 0.0.0.0 --port 8001 --reload &
BACKEND_PID=$!

echo "==> Instalez dependențele frontend"
cd "$ROOT/frontend"
yarn install --silent

echo "==> Pornesc frontend pe http://localhost:3000"
yarn start &
FRONTEND_PID=$!

# oprește ambele procese la Ctrl+C
trap "echo '==> Opresc serverele...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" INT TERM

echo ""
echo "======================================================"
echo "  Panou Antrenor rulează:"
echo "    Frontend  -> http://localhost:3000"
echo "    Backend   -> http://localhost:8001/api"
echo "    Login     -> antrenor@elvisprocut.ro / Antrenor2025!"
echo "  Apasă Ctrl+C pentru a opri."
echo "======================================================"

wait
