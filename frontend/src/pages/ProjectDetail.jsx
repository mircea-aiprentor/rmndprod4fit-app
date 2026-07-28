import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import api, { formatApiError } from "@/lib/api";
import { PROJECTS } from "@/constants/testIds";
import { Sparkles, CheckCircle2, Trash2, Loader2, ArrowLeft, RefreshCw, Save, Music, Scissors, Hash, Megaphone } from "lucide-react";
import { toast } from "sonner";

const STATUS_LABEL = {
  uploaded: { t: "Încărcat", c: "text-zinc-400 bg-zinc-800" },
  processing: { t: "Procesare AI", c: "text-blue-300 bg-blue-500/15" },
  review: { t: "Așteaptă review", c: "text-amber-300 bg-amber-500/15" },
  approved: { t: "Aprobat", c: "text-[#C4F601] bg-[#C4F601]/15" },
};

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [plan, setPlan] = useState(null);

  const load = () => {
    api.get(`/projects/${id}`).then((r) => { setProject(r.data); setPlan(r.data.plan); }).catch(() => toast.error("Proiect inexistent")).finally(() => setLoading(false));
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const generate = async () => {
    setGenerating(true);
    try {
      const { data } = await api.post(`/projects/${id}/generate-plan`);
      setProject(data);
      setPlan(data.plan);
      toast.success("Plan AI generat!");
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Generarea a eșuat.");
    } finally {
      setGenerating(false);
    }
  };

  const savePlan = async () => {
    setSaving(true);
    try {
      await api.put(`/projects/${id}/plan`, {
        hook: plan.hook, caption: plan.caption, cta: plan.cta,
        subtitles: plan.subtitles, hashtags: plan.hashtags, music_theme: plan.music_theme,
      });
      toast.success("Modificări salvate.");
    } catch (err) {
      toast.error("Salvarea a eșuat.");
    } finally {
      setSaving(false);
    }
  };

  const approve = async () => {
    try {
      await api.post(`/projects/${id}/approve`);
      toast.success("Reel aprobat! Gata de export.");
      load();
    } catch { toast.error("Eroare la aprobare."); }
  };

  const remove = async () => {
    if (!window.confirm("Ștergi acest proiect?")) return;
    try { await api.delete(`/projects/${id}`); toast.success("Proiect șters."); navigate("/projects"); }
    catch { toast.error("Ștergerea a eșuat."); }
  };

  if (loading) return <DashboardLayout><div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-[#C4F601] animate-spin" /></div></DashboardLayout>;
  if (!project) return <DashboardLayout><p className="text-zinc-400">Proiect inexistent.</p></DashboardLayout>;

  const s = STATUS_LABEL[project.status] || STATUS_LABEL.uploaded;
  const upd = (k) => (e) => setPlan({ ...plan, [k]: e.target.value });
  const fieldCls = "w-full px-4 py-3 rounded-md bg-zinc-900 border border-white/10 text-white focus:outline-none focus:border-[#C4F601] focus:ring-1 focus:ring-[#C4F601] transition-colors";
  const labelCls = "flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-zinc-500 mb-2";

  return (
    <DashboardLayout>
      <div data-testid={PROJECTS.detailPage} className="animate-fade-up">
        <button onClick={() => navigate("/projects")} className="flex items-center gap-2 text-sm text-zinc-500 hover:text-white mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Înapoi la proiecte
        </button>

        <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className={`text-xs font-medium px-3 py-1 rounded-full ${s.c}`}>{s.t}</span>
              <span className="text-xs text-zinc-500">{project.theme}</span>
            </div>
            <h1 className="font-heading text-3xl sm:text-4xl font-black tracking-tighter uppercase">{project.title}</h1>
          </div>
          <button data-testid={PROJECTS.deleteButton} onClick={remove} className="flex items-center gap-2 px-4 py-2 rounded-md bg-zinc-900 border border-white/10 text-zinc-400 hover:text-red-400 hover:border-red-500/40 transition-colors text-sm">
            <Trash2 className="w-4 h-4" aria-hidden="true" /> Șterge
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-[#18181B] border border-white/10 rounded-md p-5 sticky top-6">
              <div className="aspect-[9/16] max-h-80 mx-auto rounded-md bg-zinc-900 border border-white/5 flex items-center justify-center mb-4">
                <span className="font-heading text-zinc-700 text-sm uppercase tracking-widest">9:16 Preview</span>
              </div>
              <p className="text-xs text-zinc-500 truncate mb-4">{project.filename || "video.mp4"}</p>
              {project.status === "uploaded" && (
                <button data-testid={PROJECTS.generatePlanButton} onClick={generate} disabled={generating} className="w-full py-3 rounded-md bg-[#C4F601] text-black font-bold uppercase tracking-wide hover:bg-[#A6D300] transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                  {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" aria-hidden="true" />}
                  {generating ? "AI montează..." : "Generează plan AI"}
                </button>
              )}
              {project.status === "review" && (
                <div className="space-y-2">
                  <button data-testid={PROJECTS.approveButton} onClick={approve} className="w-full py-3 rounded-md bg-[#C4F601] text-black font-bold uppercase tracking-wide hover:bg-[#A6D300] transition-colors flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4" aria-hidden="true" /> Aprobă Reel
                  </button>
                  <button onClick={generate} disabled={generating} className="w-full py-3 rounded-md bg-zinc-900 border border-white/10 text-white font-medium hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                    {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" aria-hidden="true" />} Regenerează
                  </button>
                </div>
              )}
              {project.status === "approved" && (
                <div className="text-center py-2">
                  <CheckCircle2 className="w-8 h-8 text-[#C4F601] mx-auto mb-2" aria-hidden="true" />
                  <p className="text-sm text-[#C4F601] font-medium">Aprobat — gata de export</p>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-2">
            {!plan ? (
              <div className="bg-[#18181B] border border-white/10 rounded-md py-20 text-center">
                <Sparkles className="w-12 h-12 text-zinc-700 mx-auto mb-4" aria-hidden="true" />
                <p className="text-zinc-400">Niciun plan de editare încă.</p>
                <p className="text-sm text-zinc-600 mt-1">Apasă „Generează plan AI" pentru montaj automat.</p>
              </div>
            ) : (
              <div className="bg-[#18181B] border border-white/10 rounded-md p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="font-heading text-xl font-bold tracking-tight uppercase">Plan de editare AI</h2>
                  <button data-testid={PROJECTS.savePlanButton} onClick={savePlan} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-md bg-zinc-900 border border-white/10 text-white hover:bg-zinc-800 transition-colors text-sm disabled:opacity-60">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" aria-hidden="true" />} Salvează
                  </button>
                </div>

                <div>
                  <label className={labelCls}><Megaphone className="w-3.5 h-3.5" aria-hidden="true" /> Hook (primele 3s)</label>
                  <textarea data-testid={PROJECTS.hookField} value={plan.hook || ""} onChange={upd("hook")} rows={2} className={fieldCls + " resize-none"} />
                </div>

                <div>
                  <label className={labelCls}>Subtitrări sugerate</label>
                  <textarea value={plan.subtitles || ""} onChange={upd("subtitles")} rows={3} className={fieldCls + " resize-none"} />
                </div>

                <div>
                  <label className={labelCls}>Descriere postare</label>
                  <textarea data-testid={PROJECTS.captionField} value={plan.caption || ""} onChange={upd("caption")} rows={3} className={fieldCls + " resize-none"} />
                </div>

                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label className={labelCls}><Megaphone className="w-3.5 h-3.5" aria-hidden="true" /> Call to action</label>
                    <input data-testid={PROJECTS.ctaField} value={plan.cta || ""} onChange={upd("cta")} className={fieldCls} />
                  </div>
                  <div>
                    <label className={labelCls}><Music className="w-3.5 h-3.5" aria-hidden="true" /> Muzică / mood</label>
                    <input value={plan.music_theme || ""} onChange={upd("music_theme")} className={fieldCls} />
                  </div>
                </div>

                <div>
                  <label className={labelCls}><Hash className="w-3.5 h-3.5" aria-hidden="true" /> Hashtags</label>
                  <div className="flex flex-wrap gap-2">
                    {(plan.hashtags || []).map((h, i) => (
                      <span key={i} className="text-xs px-3 py-1.5 rounded-full bg-zinc-900 border border-white/10 text-[#C4F601] font-mono">{h}</span>
                    ))}
                  </div>
                </div>

                {plan.suggested_cuts?.length > 0 && (
                  <div>
                    <label className={labelCls}><Scissors className="w-3.5 h-3.5" aria-hidden="true" /> Tăieturi sugerate</label>
                    <div className="space-y-2">
                      {plan.suggested_cuts.map((c, i) => (
                        <div key={i} className="flex gap-3 p-3 rounded-md bg-zinc-900 border border-white/5">
                          <span className="font-mono text-xs text-[#C4F601] shrink-0 pt-0.5">{c.time}</span>
                          <span className="text-sm text-zinc-400">{c.note}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
