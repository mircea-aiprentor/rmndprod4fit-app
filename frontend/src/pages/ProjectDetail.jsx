import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import DashboardLayout from "@/components/DashboardLayout";
import api, { formatApiError } from "@/lib/api";
import { PROJECTS } from "@/constants/testIds";
import {
  Sparkles, CheckCircle2, Trash2, Loader2, ArrowLeft, RefreshCw, Save,
  Music, Scissors, Hash, Megaphone, Copy, Download, Check, Circle,
  Captions, Play, Wand2, Subtitles,
} from "lucide-react";
import { toast } from "sonner";

const STATUS_LABEL = {
  uploaded: { t: "Încărcat", c: "text-zinc-400 bg-zinc-800" },
  processing: { t: "Procesare AI", c: "text-blue-300 bg-blue-500/15" },
  review: { t: "Așteaptă review", c: "text-amber-300 bg-amber-500/15" },
  approved: { t: "Aprobat", c: "text-[#C4F601] bg-[#C4F601]/15" },
};

const AI_STEPS = {
  prompt: ["Analizez tema aleasă...", "Scriu scriptul reel-ului...", "Găsesc hook-ul perfect...", "Sincronizez subtitrările...", "Selectez hashtag-urile...", "Aleg muzica potrivită...", "Finalizez montajul..."],
  subtitle: ["Extrag audio din video...", "Transcriu vorbirea...", "Sincronizez subtitrările...", "Curăț și formatez textul...", "Finalizez subtitrările..."],
};

const FLOW = [
  { key: "upload", label: "Upload" },
  { key: "ai", label: "Procesare" },
  { key: "review", label: "Review" },
  { key: "approve", label: "Aprobare" },
  { key: "export", label: "Export" },
];

function flowIndex(status) {
  if (status === "uploaded" || status === "processing") return 1;
  if (status === "review") return 3;
  if (status === "approved") return 5;
  return 0;
}

function srtTime(t) {
  const ms = Math.round((t % 1) * 1000);
  const s = Math.floor(t) % 60, m = Math.floor(t / 60) % 60, h = Math.floor(t / 3600);
  const p = (n, l = 2) => String(n).padStart(l, "0");
  return `${p(h)}:${p(m)}:${p(s)},${p(ms, 3)}`;
}
function clock(t) {
  const s = Math.floor(t) % 60, m = Math.floor(t / 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
function buildSegments(plan) {
  if (plan?.subtitle_segments?.length) {
    return plan.subtitle_segments.map((s) => ({ start: Number(s.start) || 0, end: Number(s.end) || (Number(s.start) || 0) + 3, text: s.text || "" }));
  }
  const parts = (plan?.subtitles || "").split(/(?<=[.!?])\s+/).map((x) => x.trim()).filter(Boolean);
  return parts.map((text, i) => ({ start: i * 3, end: i * 3 + 3, text }));
}

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [aiStep, setAiStep] = useState(0);
  const [plan, setPlan] = useState(null);
  const [segments, setSegments] = useState([]);
  const [mode, setMode] = useState("prompt");
  const [currentTime, setCurrentTime] = useState(0);
  const [simPlaying, setSimPlaying] = useState(false);
  const stepTimer = useRef();
  const videoRef = useRef();
  const simRef = useRef();

  const token = localStorage.getItem("pa_token");
  const videoUrl = project ? `${process.env.REACT_APP_BACKEND_URL}/api/files/${project.storage_path}?auth=${token}` : null;
  const activeMode = project?.mode || mode;
  const steps = AI_STEPS[activeMode] || AI_STEPS.prompt;

  const load = () => api.get(`/projects/${id}`)
    .then((r) => { setProject(r.data); setPlan(r.data.plan); setSegments(buildSegments(r.data.plan)); if (r.data.mode) setMode(r.data.mode); })
    .catch(() => toast.error("Proiect inexistent"))
    .finally(() => setLoading(false));
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  useEffect(() => {
    if (generating) { setAiStep(0); stepTimer.current = setInterval(() => setAiStep((s) => Math.min(s + 1, steps.length - 1)), 1500); }
    else clearInterval(stepTimer.current);
    return () => clearInterval(stepTimer.current);
    // eslint-disable-next-line
  }, [generating]);

  useEffect(() => {
    if (!simPlaying) { clearInterval(simRef.current); return; }
    const maxEnd = segments.length ? Math.max(...segments.map((s) => s.end)) : 0;
    simRef.current = setInterval(() => setCurrentTime((t) => (t >= maxEnd ? (setSimPlaying(false), 0) : +(t + 0.25).toFixed(2))), 250);
    return () => clearInterval(simRef.current);
  }, [simPlaying, segments]);

  const activeCue = segments.find((s) => currentTime >= s.start && currentTime < s.end);

  const generate = async (chosenMode) => {
    const m = chosenMode || mode;
    setGenerating(true);
    try {
      const { data } = await api.post(`/projects/${id}/generate-plan?mode=${m}`);
      setProject(data); setPlan(data.plan); setSegments(buildSegments(data.plan)); setMode(data.mode || m);
      toast.success(m === "subtitle" ? "Subtitrări generate!" : "Reel generat cu subtitrări!");
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Generarea a eșuat.");
    } finally { setGenerating(false); }
  };

  const approve = async () => {
    try { await api.post(`/projects/${id}/approve`); toast.success("Reel aprobat! Gata de export."); load(); }
    catch { toast.error("Eroare la aprobare."); }
  };
  const remove = async () => {
    if (!window.confirm("Ștergi acest proiect?")) return;
    try { await api.delete(`/projects/${id}`); toast.success("Proiect șters."); navigate("/projects"); }
    catch { toast.error("Ștergerea a eșuat."); }
  };
  const copy = (text, label) => navigator.clipboard.writeText(text || "").then(() => toast.success(`${label} copiat!`)).catch(() => toast.error("Nu s-a putut copia."));
  const copyEverything = () => copy(`${plan.hook || ""}\n\n${plan.caption || ""}\n\n${plan.cta || ""}\n\n${(plan.hashtags || []).join(" ")}`, "Tot conținutul");
  const downloadSRT = () => {
    if (!segments.length) return toast.error("Nicio subtitrare de exportat.");
    let srt = "";
    segments.forEach((c, i) => { srt += `${i + 1}\n${srtTime(c.start)} --> ${srtTime(c.end)}\n${c.text}\n\n`; });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([srt], { type: "text/plain" }));
    a.download = `${project.title || "reel"}.srt`; a.click(); URL.revokeObjectURL(a.href);
    toast.success("Subtitrări SRT descărcate!");
  };
  const downloadVideo = () => window.open(videoUrl, "_blank");

  if (loading) return <DashboardLayout><div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-[#C4F601] animate-spin" /></div></DashboardLayout>;
  if (!project) return <DashboardLayout><p className="text-zinc-400">Proiect inexistent.</p></DashboardLayout>;

  const s = STATUS_LABEL[project.status] || STATUS_LABEL.uploaded;
  const fi = flowIndex(generating ? "processing" : project.status);
  const isSubtitleOnly = activeMode === "subtitle";

  return (
    <DashboardLayout>
      <div data-testid={PROJECTS.detailPage}>
        <button onClick={() => navigate("/projects")} className="flex items-center gap-2 text-sm text-zinc-500 hover:text-white mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Înapoi la proiecte
        </button>

        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <span className={`text-xs font-medium px-3 py-1 rounded-full ${s.c}`}>{s.t}</span>
              <span className="text-xs text-zinc-500">{project.theme}</span>
              {project.mode && <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full bg-zinc-800 text-zinc-400">{project.mode === "subtitle" ? "Mod: Subtitrare" : "Mod: Prompt"}</span>}
            </div>
            <h1 className="font-heading text-3xl sm:text-4xl font-extrabold">{project.title}</h1>
          </div>
          <button data-testid={PROJECTS.deleteButton} onClick={remove} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-900 border border-white/10 text-zinc-400 hover:text-red-400 hover:border-red-500/40 transition-colors text-sm">
            <Trash2 className="w-4 h-4" aria-hidden="true" /> Șterge
          </button>
        </div>

        {/* Workflow timeline */}
        <div className="bg-[#18181B] border border-white/10 rounded-xl p-5 mb-6 overflow-x-auto">
          <div className="flex items-center min-w-[520px]">
            {FLOW.map((step, i) => {
              const stepPos = i * 2 + 1, active = fi >= stepPos;
              return (
                <div key={step.key} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center gap-2">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center border transition-colors ${active ? "bg-[#C4F601] border-[#C4F601] text-black" : "bg-zinc-900 border-white/10 text-zinc-600"}`}>
                      {active ? <Check className="w-4 h-4" /> : <Circle className="w-3 h-3" />}
                    </div>
                    <span className={`text-[11px] font-medium whitespace-nowrap ${active ? "text-white" : "text-zinc-600"}`}>{step.label}</span>
                  </div>
                  {i < FLOW.length - 1 && (
                    <div className="flex-1 h-0.5 mx-2 mb-6 bg-zinc-800 relative overflow-hidden rounded-full">
                      <div className="absolute inset-0 bg-[#C4F601] transition-all duration-500" style={{ width: fi > stepPos ? "100%" : "0%" }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column */}
          <div className="lg:col-span-1 space-y-6">
            {/* Preview */}
            <div className="bg-[#18181B] border border-white/10 rounded-xl p-5">
              <div className="relative aspect-[9/16] max-h-96 mx-auto rounded-lg overflow-hidden bg-gradient-to-b from-zinc-900 to-zinc-950 border border-white/5 flex items-center justify-center">
                {videoUrl ? (
                  <video ref={videoRef} src={videoUrl} className="w-full h-full object-cover" playsInline muted
                    onTimeUpdate={(e) => { setSimPlaying(false); setCurrentTime(e.target.currentTime); }} onError={() => {}} />
                ) : <span className="font-heading text-zinc-700 text-sm uppercase tracking-widest">9:16 Preview</span>}
                {segments.length > 0 && activeCue && (
                  <div className="absolute inset-x-0 bottom-0 p-4 pb-6 flex justify-center pointer-events-none">
                    <span className="max-w-[92%] text-center font-heading font-extrabold text-white text-lg leading-tight px-3 py-1.5 rounded-md" style={{ background: "rgba(0,0,0,0.55)", textShadow: "0 2px 6px rgba(0,0,0,0.8)" }}>{activeCue.text}</span>
                  </div>
                )}
              </div>
              {segments.length > 0 && (
                <button data-testid="subtitle-preview-btn" onClick={() => { setCurrentTime(0); setSimPlaying(true); }} className="w-full mt-3 py-2 rounded-lg bg-zinc-900 border border-white/10 text-white text-sm font-medium hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2">
                  <Play className="w-4 h-4" aria-hidden="true" /> Previzualizează subtitrările
                </button>
              )}
              <p className="text-xs text-zinc-500 truncate mt-3">{project.filename || "video.mp4"}</p>
            </div>

            {/* Mode selector + generate (only when not yet processed) */}
            {project.status === "uploaded" && !generating && (
              <div className="bg-[#18181B] border border-white/10 rounded-xl p-5">
                <h3 className="font-heading text-base font-bold mb-3">Ce vrei să faci?</h3>
                <div className="grid grid-cols-1 gap-2 mb-3">
                  <ModeBtn testid="mode-prompt" active={mode === "prompt"} onClick={() => setMode("prompt")} icon={Wand2} title="Prompt (aleg eu tema)" />
                  <ModeBtn testid="mode-subtitle" active={mode === "subtitle"} onClick={() => setMode("subtitle")} icon={Subtitles} title="Subtitrare (doar transcrie)" />
                </div>
                <div className="text-sm text-zinc-400 bg-zinc-900 border border-white/5 rounded-lg p-3 mb-4">
                  {mode === "prompt"
                    ? "Alegem grupa musculară și tipul de conținut, apoi generăm un script nou pentru reel."
                    : "Transcriem exact ce se spune în video și generăm subtitrări sincronizate, gata de export."}
                </div>
                <button data-testid={PROJECTS.generatePlanButton} onClick={() => generate()} className="w-full py-3 rounded-lg bg-[#C4F601] text-black font-bold hover:bg-[#A6D300] transition-colors flex items-center justify-center gap-2">
                  <Sparkles className="w-4 h-4" aria-hidden="true" /> {mode === "subtitle" ? "Generează subtitrări" : "Generează reel"}
                </button>
              </div>
            )}

            {generating && (
              <div className="bg-[#18181B] border border-white/10 rounded-xl p-5 space-y-2.5">
                {steps.map((label, i) => (
                  <div key={i} className={`flex items-center gap-2.5 text-sm transition-opacity ${i <= aiStep ? "opacity-100" : "opacity-35"}`}>
                    {i < aiStep ? <CheckCircle2 className="w-4 h-4 text-[#C4F601] shrink-0" aria-hidden="true" /> : i === aiStep ? <Loader2 className="w-4 h-4 text-[#C4F601] animate-spin shrink-0" aria-hidden="true" /> : <Circle className="w-4 h-4 text-zinc-700 shrink-0" aria-hidden="true" />}
                    <span className={i <= aiStep ? "text-zinc-200" : "text-zinc-600"}>{label}</span>
                  </div>
                ))}
              </div>
            )}

            {project.status === "review" && !generating && (
              <div className="bg-[#18181B] border border-white/10 rounded-xl p-5 space-y-2">
                <button data-testid={PROJECTS.approveButton} onClick={approve} className="w-full py-3 rounded-lg bg-[#C4F601] text-black font-bold hover:bg-[#A6D300] transition-colors flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4" aria-hidden="true" /> Aprobă Reel
                </button>
                <button onClick={() => generate(project.mode)} className="w-full py-3 rounded-lg bg-zinc-900 border border-white/10 text-white font-medium hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4" aria-hidden="true" /> Regenerează
                </button>
              </div>
            )}

            {project.status === "approved" && (
              <div className="bg-[#18181B] border border-white/10 rounded-xl p-5">
                <div className="text-center py-2 mb-3">
                  <CheckCircle2 className="w-8 h-8 text-[#C4F601] mx-auto mb-2" aria-hidden="true" />
                  <p className="text-sm text-[#C4F601] font-medium">Aprobat — gata de export</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={downloadVideo} className="col-span-2 py-2.5 rounded-lg bg-[#C4F601] text-black font-bold hover:bg-[#A6D300] transition-colors flex items-center justify-center gap-2 text-sm">
                    <Download className="w-4 h-4" aria-hidden="true" /> Descarcă video
                  </button>
                  <ExportBtn onClick={downloadSRT} icon={Captions} label="Subtitrări SRT" wide />
                  <ExportBtn onClick={() => copy(segments.map((c) => c.text).join("\n"), "Subtitrări")} icon={Copy} label="Copiază subtitrări" wide />
                  {!isSubtitleOnly && <>
                    <ExportBtn onClick={() => copy(plan?.caption, "Descriere")} icon={Copy} label="Descriere" />
                    <ExportBtn onClick={() => copy((plan?.hashtags || []).join(" "), "Hashtags")} icon={Hash} label="Hashtags" />
                    <button onClick={copyEverything} className="col-span-2 py-2.5 rounded-lg bg-zinc-900 border border-white/10 text-white font-medium hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2 text-sm">
                      <Copy className="w-4 h-4" aria-hidden="true" /> Copiază tot
                    </button>
                  </>}
                </div>
              </div>
            )}
          </div>

          {/* Right column: results */}
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              {!plan && !generating ? (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="bg-[#18181B] border border-white/10 rounded-xl py-20 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-white/5 flex items-center justify-center mx-auto mb-4">
                    <Captions className="w-7 h-7 text-zinc-600" aria-hidden="true" />
                  </div>
                  <p className="text-zinc-200 font-medium">Niciun rezultat încă</p>
                  <p className="text-sm text-zinc-500 mt-1">Alege un mod și apasă butonul de generare.</p>
                </motion.div>
              ) : generating ? (
                <motion.div key="gen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="bg-[#18181B] border border-white/10 rounded-xl py-24 text-center">
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 3, ease: "linear" }} className="w-16 h-16 rounded-2xl bg-[#C4F601]/10 flex items-center justify-center mx-auto mb-5">
                    <Sparkles className="w-8 h-8 text-[#C4F601]" aria-hidden="true" />
                  </motion.div>
                  <p className="font-heading text-xl font-bold">{activeMode === "subtitle" ? "Generez subtitrările" : "AI montează Reel-ul tău"}</p>
                  <p className="text-sm text-zinc-500 mt-2">{steps[aiStep]}</p>
                </motion.div>
              ) : plan ? (
                <motion.div key="plan" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                  {/* Subtitles (read-only) */}
                  <div className="bg-[#18181B] border border-[#C4F601]/25 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="font-heading text-lg font-bold flex items-center gap-2"><Captions className="w-5 h-5 text-[#C4F601]" aria-hidden="true" /> Subtitrări sincronizate</h2>
                      <div className="flex items-center gap-2">
                        <button data-testid="subtitle-download-srt" onClick={downloadSRT} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-white/10 text-white hover:bg-zinc-800 transition-colors text-xs">
                          <Download className="w-3.5 h-3.5" aria-hidden="true" /> .SRT
                        </button>
                        <span className="text-xs text-zinc-500">{segments.length} linii</span>
                      </div>
                    </div>
                    <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1" data-testid="subtitle-list">
                      {segments.length === 0 ? <p className="text-sm text-zinc-500 py-4 text-center">Nicio subtitrare disponibilă.</p> : segments.map((c, i) => {
                        const isActive = activeCue === c;
                        return (
                          <div key={i} className={`flex items-start gap-3 p-2.5 rounded-lg border transition-colors ${isActive ? "border-[#C4F601]/60 bg-[#C4F601]/5" : "border-white/5 bg-zinc-900"}`}>
                            <span className="font-mono text-[11px] text-[#C4F601] shrink-0 pt-0.5 w-20">{clock(c.start)}–{clock(c.end)}</span>
                            <span className="text-sm text-zinc-200 flex-1">{c.text}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Post details — only in prompt mode */}
                  {!isSubtitleOnly && (plan.hook || plan.caption || plan.hashtags) && (
                    <div className="bg-[#18181B] border border-white/10 rounded-xl p-6 space-y-5">
                      <h2 className="font-heading text-lg font-bold flex items-center gap-2"><Sparkles className="w-4 h-4 text-[#C4F601]" aria-hidden="true" /> Detalii postare</h2>
                      {plan.hook && <Field icon={Megaphone} label="Hook (primele 3s)" value={plan.hook} onCopy={() => copy(plan.hook, "Hook")} />}
                      {plan.caption && <Field icon={Copy} label="Descriere postare" value={plan.caption} onCopy={() => copy(plan.caption, "Descriere")} multiline />}
                      <div className="grid sm:grid-cols-2 gap-5">
                        {plan.cta && <Field icon={Megaphone} label="Call to action" value={plan.cta} onCopy={() => copy(plan.cta, "CTA")} />}
                        {plan.music_theme && <Field icon={Music} label="Muzică / mood" value={plan.music_theme} />}
                      </div>
                      {plan.hashtags?.length > 0 && (
                        <div>
                          <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-zinc-500 mb-2"><Hash className="w-3.5 h-3.5" aria-hidden="true" /> Hashtags</label>
                          <div className="flex flex-wrap gap-2">
                            {plan.hashtags.map((h, i) => <span key={i} className="text-xs px-3 py-1.5 rounded-full bg-zinc-900 border border-white/10 text-[#C4F601] font-mono">{h}</span>)}
                          </div>
                        </div>
                      )}
                      {plan.suggested_cuts?.length > 0 && (
                        <div>
                          <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-zinc-500 mb-2"><Scissors className="w-3.5 h-3.5" aria-hidden="true" /> Tăieturi sugerate</label>
                          <div className="space-y-2">
                            {plan.suggested_cuts.map((c, i) => (
                              <div key={i} className="flex gap-3 p-3 rounded-lg bg-zinc-900 border border-white/5">
                                <span className="font-mono text-xs text-[#C4F601] shrink-0 pt-0.5">{c.time}</span>
                                <span className="text-sm text-zinc-400">{c.note}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function ModeBtn({ active, onClick, icon: Icon, title, testid }) {
  return (
    <button data-testid={testid} onClick={onClick} className={`flex items-center gap-3 px-4 py-3 rounded-lg border font-bold transition-colors text-left ${active ? "bg-[#C4F601] border-[#C4F601] text-black" : "bg-zinc-900 border-white/10 text-zinc-300 hover:bg-zinc-800 hover:text-white"}`}>
      <Icon className="w-5 h-5 shrink-0" aria-hidden="true" />
      <span className="text-sm">{title}</span>
    </button>
  );
}

function Field({ icon: Icon, label, value, onCopy, multiline }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-zinc-500"><Icon className="w-3.5 h-3.5" aria-hidden="true" /> {label}</label>
        {onCopy && <button onClick={onCopy} className="text-zinc-500 hover:text-[#C4F601] transition-colors" aria-label={`copiază ${label}`}><Copy className="w-4 h-4" /></button>}
      </div>
      <div className={`px-4 py-3 rounded-lg bg-zinc-900 border border-white/10 text-white text-sm ${multiline ? "" : "truncate"}`}>{value}</div>
    </div>
  );
}

function ExportBtn({ onClick, icon: Icon, label, wide }) {
  return (
    <button onClick={onClick} className={`${wide ? "col-span-2" : ""} py-2.5 rounded-lg bg-zinc-900 border border-white/10 text-white font-medium hover:bg-zinc-800 hover:border-white/20 transition-colors flex items-center justify-center gap-2 text-sm`}>
      <Icon className="w-4 h-4" aria-hidden="true" /> {label}
    </button>
  );
}
