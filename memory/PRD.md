# PRD — Panou Antrenor (ElvisPro Cut)

## Problem statement
Audit & improve the coach dashboard for elvisprocut.ro. The connected GitHub repo contained ONLY the default Emergent boilerplate (no real app code), so — per user confirmation — we built a fresh, modern "Panou Antrenor" from scratch matching the brand in spirit.

## Product
Romanian SaaS for fitness coaches: upload raw training video → AI generates a short-form Reels editing plan (transcript/subtitles, hook, caption, CTA, hashtags, suggested cuts, music) → coach reviews/approves/exports. Subscription tiers via Stripe.

## Users
- Solo online/gym coaches (Coach, Coach+)
- Gyms/studios managing up to 5 coaches (Gym/Studio)

## Tech / Architecture
- Frontend: React 19 (CRA/craco), Tailwind, shadcn/ui, sonner, lucide, recharts. Dark "Performance Pro" theme (Barlow Condensed + Inter, neon volt green #C4F601).
- Backend: FastAPI + MongoDB (motor). JWT Bearer auth (localStorage pa_token).
- Integrations: Claude Sonnet 4.6 (Emergent LLM key) for AI plans; Emergent object storage for videos; Stripe subscriptions (claimable sandbox, RON).

## Implemented (2026-06)
- Auth: email/password register/login, JWT, seeded demo coach.
- Projects: upload video, CRUD, AI plan generation + edit + approve.
- Dashboard: stats (total, month, approved, quota) + recent projects.
- Billing: 3 Stripe plans, checkout, webhook, payment-success polling.
- Responsive layout (sidebar desktop / drawer mobile). Toast error handling.
- Tested: 17/17 backend + all frontend flows pass (iteration_1).

## Prioritized backlog
- P1: Google social login (currently placeholder "coming soon").
- P1: Real server-side video processing (9:16 crop + burned subtitles) — deferred Phase 2.
- P1: Suggested coach features (await user confirm): client/athlete management, scheduling/calendar, progress tracking, notifications, training plans.
- P2: Stripe billing portal (manage/cancel), export/download of approved reels, forgot/reset password UI, brute-force lockout.
- P2: Pagination on projects, thumbnail previews from video.

## Next tasks
Await user confirmation on which 3–5 dashboard features to build next.
