#!/usr/bin/env bash
# Panou Antrenor (FRONTEND) — pornire rapidă locală
# Utilizare: ./start.sh
set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT/frontend"

if [ ! -f .env ]; then
  echo "==> Lipsește frontend/.env — copiez din exemplu (completează cheile!)"
  cp .env.example .env
fi

echo "==> Instalez dependențele frontend"
yarn install --silent

echo ""
echo "======================================================"
echo "  Panou Antrenor (frontend) -> http://localhost:3000"
echo "  Conectează backend-ul din frontend/.env (vezi INTEGRARE.md)"
echo "======================================================"

yarn start
