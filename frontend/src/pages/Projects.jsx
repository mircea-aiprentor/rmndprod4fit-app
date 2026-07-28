import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/DashboardLayout";
import api, { formatApiError } from "@/lib/api";
import { PROJECTS } from "@/constants/testIds";
import { Plus, UploadCloud, Loader2, Clapperboard, X, CheckCircle2, Film, Wand2, Subtitles } from "lucide-react";
import { toast } from "sonner";

const THEMES = ["General", "Antrenament forță", "Cardio & HIIT", "Nutriție", "Motivațional", "Transformare client"];
const STATUS_LABEL = {
  uploaded: { t: "Încărcat", c: "text-zinc-400 bg-zinc-800" },
  processing: { t: "Procesare AI", c: "text-blue-300 bg-blue-500/15" },
  review: { t: "Așteaptă review", c: "text-amber-300 bg-amber-500/15" },
  approved: { t: "Aprobat", c: "text-[#C4F601] bg-[#C4F601]/15" },
};

export default function Projects() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const load = () => api.get("/projects").then((r) => setProjects(r.data)).catch(() => {}).finally(() => setLoading(false));
  useEffect(() => {
    load();
    if (params.get("new") === "1") { setShowModal(true); setParams({}); }
    // eslint-disable-next-line
  }, []);

  return (
    <DashboardLayout>
      <div data-testid={PROJECTS.page}>
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Fluxul tău de conținut</p>
            <h1 className="font-heading text-4xl sm:text-5xl font-extrabold mt-1">Proiecte Reels</h1>
          </div>
          <button data-testid={PROJECTS.uploadButton} onClick={() => setShowModal(true)} className="flex items-center gap-2 px-5 py-3 rounded-lg bg-[#C4F601] text-black font-bold hover:bg-[#A6D300] transition-colors">
            <Plus className="w-5 h-5" aria-hidden="true" /> Încarcă video
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => <div key={i} className="h-56 bg-[#18181B] border border-white/10 rounded-xl animate-pulse" />)}
          </div>
        ) : projects.length === 0 ? (
          <div className="bg-[#18181B] border border-white/10 rounded-xl py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-white/5 flex items-center justify-center mx-auto mb-5">
              <Film className="w-8 h-8 text-zinc-600" aria-hidden="true" />
            </div>
            <p className="text-zinc-200 font-medium text-lg">Niciun proiect încă</p>
            <p className="text-zinc-500 mt-1 mb-6 max-w-sm mx-auto text-sm">Încarcă un clip brut de la antrenament și lasă AI-ul să-l transforme într-un Reel gata de postat.</p>
            <button onClick={() => setShowModal(true)} className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-[#C4F601] text-black font-bold hover:bg-[#A6D300] transition-colors">
              <UploadCloud className="w-4 h-4" aria-hidden="true" /> Încarcă primul video
            </button>
          </div>
        ) : (
          <div data-testid={PROJECTS.grid} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p, i) => {
              const s = STATUS_LABEL[p.status] || STATUS_LABEL.uploaded;
              return (
                <motion.button
                  key={p.id} data-testid={PROJECTS.card}
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  whileHover={{ y: -4 }}
                  onClick={() => navigate(`/projects/${p.id}`)}
                  className="bg-[#18181B] border border-white/10 rounded-xl p-4 text-left hover:border-[#C4F601]/40 transition-colors group"
                >
                  <div className="aspect-video rounded-lg bg-zinc-900 mb-4 flex items-center justify-center border border-white/5 group-hover:border-[#C4F601]/20 transition-colors">
                    <Clapperboard className="w-8 h-8 text-zinc-700 group-hover:text-[#C4F601] transition-colors" aria-hidden="true" />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold truncate">{p.title}</h3>
                    <span className={`text-[10px] font-medium px-2 py-1 rounded-full ${s.c} shrink-0`}>{s.t}</span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">{p.theme}</p>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>

      {showModal && <UploadModal onClose={() => setShowModal(false)} onDone={() => { setShowModal(false); load(); }} onCreated={(id) => navigate(`/projects/${id}`)} />}
    </DashboardLayout>
  );
}

function UploadModal({ onClose, onDone, onCreated }) {
  const [title, setTitle] = useState("");
  const [theme, setTheme] = useState("General");
  const [notes, setNotes] = useState("");
  const [mode, setMode] = useState("prompt");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef();

  const pickFile = (f) => {
    if (!f) return;
    if (!f.type.startsWith("video/")) return toast.error("Selectează un fișier video.");
    if (f.size > 200 * 1024 * 1024) return toast.error("Fișierul depășește 200MB.");
    setFile(f);
    setPreview(URL.createObjectURL(f));
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ""));
  };

  const onDrop = (e) => { e.preventDefault(); setDrag(false); pickFile(e.dataTransfer.files?.[0]); };

  const submit = async (e) => {
    e.preventDefault();
    if (!file) return toast.error("Selectează un fișier video.");
    if (!title.trim()) return toast.error("Adaugă un titlu.");
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const up = await api.post("/upload", fd, { onUploadProgress: (e) => setProgress(Math.round((e.loaded * 100) / (e.total || 1))) });
      const pf = new FormData();
      pf.append("title", title); pf.append("theme", theme); pf.append("notes", notes);
      pf.append("storage_path", up.data.storage_path); pf.append("filename", up.data.filename);
      pf.append("size", up.data.size || file.size);
      pf.append("mode", mode);
      const proj = await api.post("/projects", pf);
      setDone(true);
      setTimeout(() => onCreated(proj.data.id), 1100);
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Încărcarea a eșuat.");
      setBusy(false);
    }
  };

  const inputCls = "w-full px-4 py-3 rounded-lg bg-zinc-900 border border-white/10 text-white placeholder-zinc-600 focus:outline-none focus:border-[#C4F601] focus:ring-1 focus:ring-[#C4F601] transition-colors";
  const labelCls = "block text-xs font-bold uppercase tracking-[0.15em] text-zinc-500 mb-2";
  const estSec = file ? Math.max(15, Math.round(file.size / (1024 * 1024)) * 3) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={busy ? undefined : onClose} />
      <motion.form
        initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.25 }}
        onSubmit={submit} className="relative w-full max-w-lg bg-[#18181B] border border-white/10 rounded-xl p-6 sm:p-8 max-h-[92vh] overflow-y-auto"
      >
        {!busy && <button type="button" onClick={onClose} className="absolute top-4 right-4 text-zinc-500 hover:text-white"><X className="w-5 h-5" /></button>}

        {done ? (
          <div className="py-10 text-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 18 }} className="w-16 h-16 rounded-full bg-[#C4F601]/15 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-9 h-9 text-[#C4F601]" aria-hidden="true" />
            </motion.div>
            <h2 className="font-heading text-2xl font-bold">Video încărcat!</h2>
            <p className="text-zinc-400 mt-1">Te ducem la generarea planului AI...</p>
          </div>
        ) : (
          <>
            <h2 className="font-heading text-2xl font-bold mb-6">Încarcă video brut</h2>

            <label className={labelCls}>Ce vrei să faci?</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
              <button type="button" data-testid="upload-mode-prompt" onClick={() => setMode("prompt")} className={`flex items-center gap-2.5 px-4 py-3 rounded-lg border font-bold text-sm transition-colors text-left ${mode === "prompt" ? "bg-[#C4F601] border-[#C4F601] text-black" : "bg-zinc-900 border-white/10 text-zinc-300 hover:bg-zinc-800 hover:text-white"}`}>
                <Wand2 className="w-4 h-4 shrink-0" aria-hidden="true" /> Prompt (aleg eu tema)
              </button>
              <button type="button" data-testid="upload-mode-subtitle" onClick={() => setMode("subtitle")} className={`flex items-center gap-2.5 px-4 py-3 rounded-lg border font-bold text-sm transition-colors text-left ${mode === "subtitle" ? "bg-[#C4F601] border-[#C4F601] text-black" : "bg-zinc-900 border-white/10 text-zinc-300 hover:bg-zinc-800 hover:text-white"}`}>
                <Subtitles className="w-4 h-4 shrink-0" aria-hidden="true" /> Subtitrare (doar transcrie)
              </button>
            </div>
            <div className="text-sm text-zinc-400 bg-zinc-900 border border-white/5 rounded-lg p-3 mb-6">
              {mode === "prompt"
                ? "Alegem grupa musculară și tipul de conținut, apoi generăm un script nou pentru reel."
                : "Transcriem exact ce se spune în video și generăm subtitrări sincronizate, gata de export."}
            </div>

            <label className={labelCls}>Fișier video</label>

            <label
              onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={onDrop}
              className={`relative flex flex-col items-center justify-center gap-2 w-full py-8 mb-5 rounded-xl bg-zinc-900 border-2 border-dashed cursor-pointer transition-colors ${drag ? "border-[#C4F601] bg-[#C4F601]/5" : "border-white/15 hover:border-[#C4F601]/50"}`}
            >
              {preview ? (
                <video src={preview} className="max-h-40 rounded-lg" muted />
              ) : (
                <>
                  <UploadCloud className={`w-10 h-10 ${drag ? "text-[#C4F601]" : "text-zinc-600"}`} aria-hidden="true" />
                  <span className="text-sm text-zinc-400 font-medium">Trage videoul aici sau click pentru a selecta</span>
                  <span className="text-xs text-zinc-600">MP4, MOV · max 200MB</span>
                </>
              )}
              <input ref={inputRef} data-testid={PROJECTS.uploadInput} type="file" accept="video/*" className="hidden" onChange={(e) => pickFile(e.target.files[0])} />
            </label>

            {file && (
              <div className="flex items-center justify-between text-xs text-zinc-500 mb-5 -mt-2">
                <span className="truncate">{file.name} · {(file.size / (1024 * 1024)).toFixed(1)} MB</span>
                <span>~{estSec}s procesare estimată</span>
              </div>
            )}

            <label className={labelCls}>Titlu</label>
            <input data-testid={PROJECTS.titleInput} value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls + (mode === "prompt" ? " mb-5" : " mb-6")} placeholder="Ex: Antrenament picioare - superset" />

            {mode === "prompt" && (
              <>
                <label className={labelCls}>Temă</label>
                <select data-testid={PROJECTS.themeSelect} value={theme} onChange={(e) => setTheme(e.target.value)} className={inputCls + " mb-5"}>
                  {THEMES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>

                <label className={labelCls}>Note pentru AI (opțional)</label>
                <textarea data-testid={PROJECTS.notesInput} value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={inputCls + " mb-6 resize-none"} placeholder="Ce vrei să evidențiezi, tonul dorit, publicul țintă..." />
              </>
            )}

            {busy && (
              <div className="mb-4">
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-[#C4F601] transition-all" style={{ width: `${progress}%` }} />
                </div>
                <p className="text-xs text-zinc-500 mt-1.5">Se încarcă... {progress}%</p>
              </div>
            )}

            <button data-testid={PROJECTS.submitButton} type="submit" disabled={busy} className="w-full py-3 rounded-lg bg-[#C4F601] text-black font-bold hover:bg-[#A6D300] transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
              {busy && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
              {busy ? "Se încarcă..." : "Încarcă și creează proiect"}
            </button>
          </>
        )}
      </motion.form>
    </div>
  );
}
