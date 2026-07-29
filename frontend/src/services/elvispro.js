/**
 * STRAT DE SERVICII — ElvisPro Cut
 * ------------------------------------------------------------------
 * Aici sunt TOATE apelurile către backend-ul tău real (Supabase + n8n).
 * Sunt scrise ca funcții gata de folosit; le apelezi din pagini când
 * conectezi propriul backend. Structura tabelelor urmează documentația:
 *   trainers(id, name, plan, pin)
 *   reels(id, trainerId, title, status, caption, hashtags, video_url, duration_seconds, mode, created_at)
 *   plans(id, name, price, stripe_price_id)
 */
import supabase from "@/lib/supabaseClient";
import { N8N_WEBHOOK_URL, N8N_API_KEY, N8N_API_HEADER, buildN8nPayload } from "@/config/integration";

function ensure() {
  if (!supabase) throw new Error("Supabase neconfigurat. Completează REACT_APP_SUPABASE_URL / ANON_KEY în .env");
}

/* ---------------- AUTH (login pe bază de PIN) ---------------- */
export async function loginWithPin(pin) {
  ensure();
  const { data, error } = await supabase
    .from("trainers")
    .select("id, name, plan")
    .eq("pin", pin)
    .single();
  if (error || !data) throw new Error("PIN invalid");
  return data; // { id, name, plan }
}

/* ---------------- REELS ---------------- */
export async function listReels(trainerId) {
  ensure();
  const { data, error } = await supabase
    .from("reels")
    .select("*")
    .eq("trainerId", trainerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getReel(reelId) {
  ensure();
  const { data, error } = await supabase.from("reels").select("*").eq("id", reelId).single();
  if (error) throw error;
  return data;
}

export async function createReel({ trainerId, title, theme, notes, mode, videoUrl }) {
  ensure();
  const { data, error } = await supabase
    .from("reels")
    .insert({ trainerId, title, status: "uploaded", mode, video_url: videoUrl })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Pornește generarea prin n8n (Claude / AssemblyAI / Shotstack).
 * n8n va scrie înapoi în `reels` (status -> processing -> done, video_url, caption...).
 */
export async function triggerGeneration({ mode, trainerId, reelId, videoUrl, title, theme, notes }) {
  if (!N8N_WEBHOOK_URL) throw new Error("n8n webhook neconfigurat (REACT_APP_N8N_WEBHOOK_URL).");
  const headers = { "Content-Type": "application/json" };
  if (N8N_API_KEY) headers[N8N_API_HEADER] = N8N_API_KEY;
  const res = await fetch(N8N_WEBHOOK_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(buildN8nPayload({ mode, trainerId, reelId, videoUrl, title, theme, notes })),
  });
  if (!res.ok) throw new Error(`n8n a răspuns ${res.status}`);
  return res.json().catch(() => ({}));
}

/**
 * Polling status reel (n8n scrie video_url + status='done' după Shotstack callback).
 */
export async function pollReelStatus(reelId, { intervalMs = 4000, timeoutMs = 300000 } = {}) {
  ensure();
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const reel = await getReel(reelId);
    if (["done", "ready", "completed", "error", "failed"].includes(reel.status)) return reel;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error("Timeout la procesarea reel-ului");
}

/* ---------------- PLANS ---------------- */
export async function listPlans() {
  ensure();
  const { data, error } = await supabase.from("plans").select("*");
  if (error) throw error;
  return data;
}

/* ---------------- STORAGE (upload video în R2 / Supabase Storage) ---------------- */
/**
 * TODO(conectează tu): urcă fișierul în Cloudflare R2 (bucket `reels-clipuri`)
 * sau Supabase Storage și întoarce URL-ul public.
 * Ex. Supabase Storage:
 *   const { data } = await supabase.storage.from('reels-clipuri').upload(path, file);
 *   return supabase.storage.from('reels-clipuri').getPublicUrl(path).data.publicUrl;
 */
export async function uploadVideo(file, trainerId) {
  throw new Error("uploadVideo: conectează R2/Supabase Storage aici.");
}
