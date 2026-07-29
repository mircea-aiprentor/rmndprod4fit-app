/**
 * PUNCT CENTRAL DE INTEGRARE — Panou Antrenor (ElvisPro Cut)
 * ----------------------------------------------------------------
 * Aici legi frontend-ul la backend-ul TĂU (Supabase + n8n + Shotstack).
 * Valorile sensibile se pun în `frontend/.env` (vezi .env.example).
 * NU pune chei "service_role" aici — doar anon/publishable key.
 */

// ---- Supabase (bază de date + auth PIN) ----
export const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || "";
export const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || "";

// ---- n8n (motor: Claude + AssemblyAI + Shotstack/Creatomate) ----
// Webhook-ul principal care pornește generarea unui reel.
export const N8N_WEBHOOK_URL = process.env.REACT_APP_N8N_WEBHOOK_URL || "";
// Header-ul "Reel API Key" (dacă webhook-ul tău are Header Auth).
export const N8N_API_KEY = process.env.REACT_APP_N8N_API_KEY || "";
export const N8N_API_HEADER = process.env.REACT_APP_N8N_API_HEADER || "x-api-key";

export const isSupabaseConfigured = () => Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
export const isN8nConfigured = () => Boolean(N8N_WEBHOOK_URL);

/**
 * Payload trimis la webhook-ul n8n când antrenorul apasă „Generează".
 * Ajustează câmpurile ca să se potrivească cu nodul tău n8n.
 */
export function buildN8nPayload({ mode, trainerId, reelId, videoUrl, title, theme, notes }) {
  return {
    mode,            // "prompt" | "subtitle"
    trainerId,
    reelId,          // id-ul rândului creat în tabelul `reels`
    video_url: videoUrl,
    title,
    theme,
    notes,
  };
}

// ---- Stripe — Payment Links LIVE (buy.stripe.com) ----
// Sursă: PLATI-LINKURI-STRIPE-2026-07-19.md (cont acct_1SiDAHFIPd40LIeh)
export const STRIPE_PLANS = [
  { key: "coach.early",        name: "Coach (early)",     price: 89,   badge: "Early · 29 locuri", url: "https://buy.stripe.com/8x2aEX1AagfO2JE1YKfMA01", features: ["9 reels / lună", "Auto-editare 3–5 min", "Subtitrări automate", "Export 1080p"] },
  { key: "coach.full",         name: "Coach",             price: 129,  url: "https://buy.stripe.com/28E3cvgv43t2gAu6f0fMA02", features: ["9 reels / lună", "Auto-editare 3–5 min", "Subtitrări automate", "Export 1080p"] },
  { key: "coachplus.early",    name: "Coach + (early)",   price: 339,  badge: "Early · 29 locuri", highlight: true, url: "https://buy.stripe.com/8x214n5QqbZyfwq7j4fMA03", features: ["25 reels / lună", "Retuș uman pe fiecare video", "Cereri implementate manual", "Suport prioritar"] },
  { key: "coachplus.full",     name: "Coach +",           price: 399,  highlight: true, url: "https://buy.stripe.com/aFa8wP0w61kU2JEeLwfMA04", features: ["25 reels / lună", "Retuș uman pe fiecare video", "Cereri implementate manual", "Suport prioritar"] },
  { key: "coachpro.full",      name: "Coach PRO",         price: 309,  url: "https://buy.stripe.com/6oU5kDbaK6Fe83YgTEfMA05", features: ["Volum mărit de reels", "Prioritate procesare", "Suport dedicat"] },
  { key: "gymstudio.full",     name: "Gym-Studio",        price: 689,  url: "https://buy.stripe.com/dRm5kD2Ee7Ji6ZU46SfMA06", features: ["Până la 5 antrenori", "Panou de administrare", "Facturare unică"] },
  { key: "coachproplus.full",  name: "Coach PRO +",       price: 1099, url: "https://buy.stripe.com/dRm9ATemW4x6bga9rcfMA07", features: ["Volum maxim de reels", "Retuș pro dedicat", "Manager de cont"] },
  { key: "gymstudioplus.full", name: "Gym-Studio +",      price: 2490, url: "https://buy.stripe.com/bJe7sL3Ii5Ba5VQ7j4fMA08", features: ["25 reels finisate pro / lună", "Echipă extinsă", "Onboarding + suport premium"] },
];
