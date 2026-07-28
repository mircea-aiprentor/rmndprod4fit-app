import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import api, { formatApiError } from "@/lib/api";
import { PROJECTS } from "@/constants/testIds";
import { Plus, UploadCloud, Loader2, Clapperboard, X } from "lucide-react";
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

  const load = () => {
    api.get("/projects").then((r) => setProjects(r.data)).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
    if (params.get("new") === "1") {
      setShowModal(true);
      setParams({});
    }
    // eslint-disable-next-line
  }, []);

  return (
    <DashboardLayout>
      <div data-testid={PROJECTS.page} className="animate-fade-up">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Fluxul tău de conținut</p>
            <h1 className="font-heading text-4xl sm:text-5xl font-black tracking-tighter uppercase mt-1">Proiecte Reels</h1>
          </div>
          <button
            data-testid={PROJECTS.uploadButton}
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-5 py-3 rounded-md bg-[#C4F601] text-black font-bold uppercase tracking-wide hover:bg-[#A6D300] transition-colors"
          >
            <Plus className="w-5 h-5" aria-hidden="true" /> Încarcă video
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-[#C4F601] animate-spin" /></div>
        ) : projects.length === 0 ? (
          <div className="bg-[#18181B] border border-white/10 rounded-md py-20 text-center">
            <Clapperboard className="w-12 h-12 text-zinc-700 mx-auto mb-4" aria-hidden="true" />
            <p className="text-zinc-400 mb-4">Niciun proiect. Încarcă un clip brut și lasă AI-ul să monteze.</p>
            <button onClick={() => setShowModal(true)} className="px-5 py-3 rounded-md bg-[#C4F601] text-black font-bold uppercase tracking-wide hover:bg-[#A6D300] transition-colors">
              Încarcă primul video
            </button>
          </div>
        ) : (
          <div data-testid={PROJECTS.grid} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p) => {
              const s = STATUS_LABEL[p.status] || STATUS_LABEL.uploaded;
              return (
                <button
                  key={p.id}
                  data-testid={PROJECTS.card}
                  onClick={() => navigate(`/projects/${p.id}`)}
                  className="bg-[#18181B] border border-white/10 rounded-md p-5 text-left hover:border-[#C4F601]/40 transition-colors group"
                >
                  <div className="aspect-video rounded-md bg-zinc-900 mb-4 flex items-center justify-center border border-white/5">
                    <Clapperboard className="w-8 h-8 text-zinc-700 group-hover:text-[#C4F601] transition-colors" aria-hidden="true" />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold truncate">{p.title}</h3>
                    <span className={`text-[10px] font-medium px-2 py-1 rounded-full ${s.c} shrink-0`}>{s.t}</span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">{p.theme}</p>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {showModal && <UploadModal onClose={() => setShowModal(false)} onDone={() => { setShowModal(false); load(); }} />}
    </DashboardLayout>
  );
}

function UploadModal({ onClose, onDone }) {
  const [title, setTitle] = useState("");
  const [theme, setTheme] = useState("General");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!file) return toast.error("Selectează un fișier video.");
    if (!title.trim()) return toast.error("Adaugă un titlu.");
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const up = await api.post("/upload", fd, {
        onUploadProgress: (e) => setProgress(Math.round((e.loaded * 100) / (e.total || 1))),
      });
      const pf = new FormData();
      pf.append("title", title);
      pf.append("theme", theme);
      pf.append("notes", notes);
      pf.append("storage_path", up.data.storage_path);
      pf.append("filename", up.data.filename);
      await api.post("/projects", pf);
      toast.success("Video încărcat! Generează planul AI.");
      onDone();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Încărcarea a eșuat.");
    } finally {
      setBusy(false);
    }
  };

  const inputCls = "w-full px-4 py-3 rounded-md bg-zinc-900 border border-white/10 text-white placeholder-zinc-600 focus:outline-none focus:border-[#C4F601] focus:ring-1 focus:ring-[#C4F601] transition-colors";
  const labelCls = "block text-xs font-bold uppercase tracking-[0.15em] text-zinc-500 mb-2";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/75" onClick={onClose} />
      <form onSubmit={submit} className="relative w-full max-w-lg bg-[#18181B] border border-white/10 rounded-md p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
        <button type="button" onClick={onClose} className="absolute top-4 right-4 text-zinc-500 hover:text-white"><X className="w-5 h-5" /></button>
        <h2 className="font-heading text-2xl font-bold tracking-tight uppercase mb-6">Încarcă video brut</h2>

        <label className={labelCls}>Fișier video</label>
        <label className="flex flex-col items-center justify-center gap-2 w-full py-8 mb-5 rounded-md bg-zinc-900 border border-dashed border-white/15 cursor-pointer hover:border-[#C4F601]/50 transition-colors">
          <UploadCloud className="w-8 h-8 text-zinc-600" aria-hidden="true" />
          <span className="text-sm text-zinc-400">{file ? file.name : "Click pentru a selecta (MP4, MOV · max 200MB)"}</span>
          <input data-testid={PROJECTS.uploadInput} type="file" accept="video/*" className="hidden" onChange={(e) => setFile(e.target.files[0])} />
        </label>

        <label className={labelCls}>Titlu</label>
        <input data-testid={PROJECTS.titleInput} value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls + " mb-5"} placeholder="Ex: Antrenament picioare - superset" />

        <label className={labelCls}>Temă</label>
        <select data-testid={PROJECTS.themeSelect} value={theme} onChange={(e) => setTheme(e.target.value)} className={inputCls + " mb-5"}>
          {THEMES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>

        <label className={labelCls}>Note pentru AI (opțional)</label>
        <textarea data-testid={PROJECTS.notesInput} value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={inputCls + " mb-6 resize-none"} placeholder="Ce vrei să evidențiezi, tonul dorit, publicul țintă..." />

        {busy && progress > 0 && (
          <div className="mb-4">
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-[#C4F601] transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-xs text-zinc-500 mt-1">Se încarcă... {progress}%</p>
          </div>
        )}

        <button data-testid={PROJECTS.submitButton} type="submit" disabled={busy} className="w-full py-3 rounded-md bg-[#C4F601] text-black font-bold uppercase tracking-wide hover:bg-[#A6D300] transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
          {busy && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
          Încarcă și creează proiect
        </button>
      </form>
    </div>
  );
}
