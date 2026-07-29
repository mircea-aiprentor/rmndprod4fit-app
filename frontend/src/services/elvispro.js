/**
 * STRAT DE SERVICII — ElvisPro Cut
 * ------------------------------------------------------------------
 * Un singur loc pentru TOATE datele. Două moduri:
 *   • REAL  — dacă REACT_APP_SUPABASE_* e setat: citește/scrie în Supabase,
 *             iar „Generează" apelează webhook-ul n8n (Claude/AssemblyAI/Shotstack).
 *   • DEMO  — dacă Supabase NU e configurat (preview): stocare în localStorage,
 *             generare simulată — ca UI-ul să fie complet funcțional/testabil.
 *
 * Tabele Supabase presupuse (ajustează maparea la schema ta):
 *   trainers(id, name, plan, pin)
 *   reels(id, trainerId, title, theme, mode, status, video_url, caption,
 *         hashtags, subtitles, subtitle_segments, hook, cta, music_theme,
 *         suggested_cuts, created_at)
 */
import supabase from "@/lib/supabaseClient";
import { N8N_WEBHOOK_URL, N8N_API_KEY, N8N_API_HEADER, buildN8nPayload } from "@/config/integration";

/* ============================ util ============================ */
const DEMO_KEY = "pa_demo_reels";
const uid = () => (window.crypto?.randomUUID ? window.crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));
const nowISO = () => new Date().toISOString();
const readDemo = () => { try { return JSON.parse(localStorage.getItem(DEMO_KEY)) || []; } catch { return []; } };
const writeDemo = (arr) => localStorage.setItem(DEMO_KEY, JSON.stringify(arr));

/** Mapează un rând Supabase `reels` la forma canonică folosită de UI. */
function fromSupabaseReel(r) {
  const hasPlan = r.hook || r.caption || r.subtitle_segments || r.subtitles;
  return {
    id: r.id,
    trainerId: r.trainerId,
    title: r.title || r.caption || "Reel",
    theme: r.theme || "General",
    mode: r.mode || "prompt",
    status: r.status || "uploaded",
    filename: r.filename || "",
    storage_path: r.video_url || "",
    created_at: r.created_at || nowISO(),
    plan: hasPlan ? {
      hook: r.hook || "",
      caption: r.caption || "",
      cta: r.cta || "",
      hashtags: r.hashtags || [],
      subtitles: r.subtitles || "",
      subtitle_segments: r.subtitle_segments || [],
      music_theme: r.music_theme || "",
      suggested_cuts: r.suggested_cuts || [],
    } : null,
  };
}

/* ============================ AUTH ============================ */
export async function loginWithPin(pin) {
  const clean = String(pin || "").trim();
  if (!supabase) {
    const demoPin = process.env.REACT_APP_DEMO_PIN || "1234";
    if (clean === demoPin) return { id: "demo-trainer", name: "Elvis Antrenor", plan: "coach_plus_monthly", plan_name: "Coach +" };
    throw new Error("PIN invalid");
  }
  const { data, error } = await supabase.from("trainers").select("id, name, plan").eq("pin", clean).single();
  if (error || !data) throw new Error("PIN invalid");
  return data;
}

/* ============================ REELS ============================ */
export async function listReels(trainerId) {
  if (!supabase) {
    return readDemo().filter((r) => r.trainerId === trainerId).sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  }
  const { data, error } = await supabase.from("reels").select("*").eq("trainerId", trainerId).order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(fromSupabaseReel);
}

export async function getReel(reelId) {
  if (!supabase) {
    const r = readDemo().find((x) => x.id === reelId);
    if (!r) throw new Error("Proiect inexistent");
    return r;
  }
  const { data, error } = await supabase.from("reels").select("*").eq("id", reelId).single();
  if (error || !data) throw new Error("Proiect inexistent");
  return fromSupabaseReel(data);
}

/**
 * Urcă fișierul video și întoarce { storage_path, filename, size }.
 * DEMO: nu urcă nimic (path placeholder). REAL: conectează Cloudflare R2 / Supabase Storage.
 */
export async function uploadVideo(file, trainerId) {
  if (!supabase) {
    return { storage_path: `demo/${trainerId}/${uid()}-${file.name}`, filename: file.name, size: file.size };
  }
  // TODO(real): urcă în R2 (bucket `reels-clipuri`) sau Supabase Storage și întoarce URL public.
  // Ex Supabase Storage:
  //   const path = `${trainerId}/${uid()}-${file.name}`;
  //   const { error } = await supabase.storage.from("reels-clipuri").upload(path, file);
  //   if (error) throw error;
  //   const url = supabase.storage.from("reels-clipuri").getPublicUrl(path).data.publicUrl;
  //   return { storage_path: url, filename: file.name, size: file.size };
  return { storage_path: "", filename: file.name, size: file.size };
}

export async function createReel({ trainerId, title, theme, notes, mode, videoUrl, filename, size }) {
  if (!supabase) {
    const reel = {
      id: uid(), trainerId, title, theme: theme || "General", notes: notes || "",
      mode: mode || "prompt", status: "uploaded", filename: filename || "",
      storage_path: videoUrl || "", size: size || 0, plan: null, created_at: nowISO(),
    };
    const arr = readDemo(); arr.push(reel); writeDemo(arr);
    return reel;
  }
  const { data, error } = await supabase
    .from("reels")
    .insert({ trainerId, title, theme, mode, status: "uploaded", video_url: videoUrl })
    .select().single();
  if (error) throw error;
  return fromSupabaseReel(data);
}

/* ---- generarea (Prompt / Subtitrare) ---- */
function demoPlan(title, mode) {
  const t = (title || "Antrenament").trim();
  const segs = [
    { start: 0, end: 2.5, text: `${t} — hai să începem!` },
    { start: 2.5, end: 5, text: "Ține spatele drept și respiră controlat." },
    { start: 5, end: 8, text: "Fiecare repetare contează." },
    { start: 8, end: 11, text: "Împinge din călcâie, nu din vârfuri." },
    { start: 11, end: 14, text: "Ultimele 3 repetări — totul sau nimic!" },
  ];
  if (mode === "subtitle") return { subtitles: segs.map((s) => s.text).join(" "), subtitle_segments: segs };
  return {
    hook: `Vrei rezultate reale la ${t.toLowerCase()}? Uite cum se face corect!`,
    subtitles: segs.map((s) => s.text).join(" "),
    subtitle_segments: segs,
    caption: `${t} explicat corect. Salvează postarea și aplic-o la următorul antrenament!`,
    cta: "Salvează și dă follow pentru mai mult.",
    hashtags: ["#fitness", "#antrenament", "#gym", "#reels", "#transformare", "#coach"],
    music_theme: "Trap motivațional / hip-hop energic",
    suggested_cuts: [
      { time: "0:00-0:03", note: "Hook vizual — cea mai spectaculoasă mișcare" },
      { time: "0:03-0:10", note: "Demonstrație tehnică lentă cu subtitrări" },
      { time: "0:10-0:15", note: "Montaj rapid + CTA final" },
    ],
  };
}

/**
 * Pornește generarea. DEMO: simulează planul instant. REAL: apelează n8n și
 * așteaptă ca n8n să scrie rezultatul în `reels` (poll pe status).
 */
export async function runGeneration({ reel, mode }) {
  const m = mode || reel.mode || "prompt";
  if (!supabase) {
    const arr = readDemo();
    const idx = arr.findIndex((x) => x.id === reel.id);
    const plan = demoPlan(reel.title, m);
    const updated = { ...(arr[idx] || reel), mode: m, status: "review", plan };
    if (idx >= 0) { arr[idx] = updated; writeDemo(arr); }
    await new Promise((r) => setTimeout(r, 600)); // mică întârziere pt. animație
    return updated;
  }
  // REAL: marchează processing, declanșează n8n, apoi poll
  await supabase.from("reels").update({ status: "processing", mode: m }).eq("id", reel.id);
  await triggerGeneration({ mode: m, trainerId: reel.trainerId, reelId: reel.id, videoUrl: reel.storage_path, title: reel.title, theme: reel.theme, notes: reel.notes });
  return pollReelStatus(reel.id);
}

export async function triggerGeneration({ mode, trainerId, reelId, videoUrl, title, theme, notes }) {
  if (!N8N_WEBHOOK_URL) throw new Error("n8n webhook neconfigurat (REACT_APP_N8N_WEBHOOK_URL).");
  const headers = { "Content-Type": "application/json" };
  if (N8N_API_KEY) headers[N8N_API_HEADER] = N8N_API_KEY;
  const res = await fetch(N8N_WEBHOOK_URL, {
    method: "POST", headers,
    body: JSON.stringify(buildN8nPayload({ mode, trainerId, reelId, videoUrl, title, theme, notes })),
  });
  if (!res.ok) throw new Error(`n8n a răspuns ${res.status}`);
  return res.json().catch(() => ({}));
}

export async function pollReelStatus(reelId, { intervalMs = 4000, timeoutMs = 300000 } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const reel = await getReel(reelId);
    if (["review", "done", "ready", "completed", "approved", "error", "failed"].includes(reel.status)) return reel;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error("Timeout la procesarea reel-ului");
}

export async function approveReel(reelId) {
  if (!supabase) {
    const arr = readDemo();
    const idx = arr.findIndex((x) => x.id === reelId);
    if (idx >= 0) { arr[idx].status = "approved"; writeDemo(arr); return arr[idx]; }
    throw new Error("Proiect inexistent");
  }
  const { data, error } = await supabase.from("reels").update({ status: "approved" }).eq("id", reelId).select().single();
  if (error) throw error;
  return fromSupabaseReel(data);
}

export async function deleteReel(reelId) {
  if (!supabase) {
    writeDemo(readDemo().filter((x) => x.id !== reelId));
    return { ok: true };
  }
  const { error } = await supabase.from("reels").delete().eq("id", reelId);
  if (error) throw error;
  return { ok: true };
}

/* ============================ PLANS / STATS ============================ */
export function quotaForPlan(plan) {
  const p = String(plan || "").toLowerCase();
  if (p.includes("gym")) return 25;
  if (p.includes("pro")) return 40;
  if (p.includes("plus") || p.includes("+")) return 25;
  return 9;
}

export function computeStats(reels, plan) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const total = reels.length;
  const approved = reels.filter((r) => r.status === "approved").length;
  const thisMonth = reels.filter((r) => (r.created_at || "") >= monthStart).length;
  const edited = reels.filter((r) => ["review", "approved"].includes(r.status)).length;
  const quota = quotaForPlan(plan);
  return {
    total_projects: total, approved, this_month: thisMonth,
    quota, quota_used: thisMonth, credits_remaining: Math.max(quota - thisMonth, 0),
    time_saved_min: edited * 120,
  };
}

export async function listPlans() {
  if (!supabase) return [];
  const { data, error } = await supabase.from("plans").select("*");
  if (error) throw error;
  return data;
}
