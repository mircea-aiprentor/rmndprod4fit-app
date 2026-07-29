import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/DashboardLayout";
import AnimatedNumber from "@/components/AnimatedNumber";
import { listReels, computeStats } from "@/services/elvispro";
import { useAuth } from "@/context/AuthContext";
import { DASHBOARD } from "@/constants/testIds";
import {
  Clapperboard, CheckCircle2, Calendar, Clock, Plus, ArrowRight, Loader2,
  UploadCloud, CreditCard, Zap, Lightbulb, Sparkles,
} from "lucide-react";

const STATUS_LABEL = {
  uploaded: { t: "Încărcat", c: "text-zinc-400 bg-zinc-800" },
  processing: { t: "Procesare AI", c: "text-blue-300 bg-blue-500/15" },
  review: { t: "Așteaptă review", c: "text-amber-300 bg-amber-500/15" },
  approved: { t: "Aprobat", c: "text-[#C4F601] bg-[#C4F601]/15" },
};

const TIPS = [
  "Primele 3 secunde decid totul — lasă AI-ul să-ți scrie un hook puternic.",
  "Postează constant: antrenorii care apar des sunt cei observați.",
  "Adaugă subtitrări — 85% dintre useri se uită fără sonor.",
  "Folosește un CTA clar la final: cere un salvat sau un comentariu.",
  "Filmează pe verticală (9:16) direct din telefon pentru cel mai bun rezultat.",
];

function fmtTime(min = 0) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

const fade = { hidden: { opacity: 0, y: 14 }, show: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.4, ease: "easeOut" } }) };

function StatCard({ icon: Icon, label, value, sub, testid, index, isTime, suffix }) {
  return (
    <motion.div
      custom={index} variants={fade} initial="hidden" animate="show"
      whileHover={{ y: -3 }}
      data-testid={testid}
      className="bg-[#18181B] border border-white/10 rounded-xl p-6 hover:border-[#C4F601]/30 transition-colors"
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">{label}</span>
        <span className="w-9 h-9 rounded-lg bg-[#C4F601]/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-[#C4F601]" aria-hidden="true" />
        </span>
      </div>
      <div className="font-heading text-4xl font-extrabold">
        {isTime ? value : <AnimatedNumber value={value} suffix={suffix || ""} />}
      </div>
      {sub && <div className="text-xs text-zinc-500 mt-1">{sub}</div>}
    </motion.div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tip] = useState(() => TIPS[Math.floor(Math.random() * TIPS.length)]);

  useEffect(() => {
    if (!user?.id) return;
    listReels(user.id)
      .then((reels) => {
        setStats({ ...computeStats(reels, user.plan), plan: user.plan, plan_name: user.plan_name });
        setRecent(reels.slice(0, 5));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const quotaPct = stats?.quota ? Math.min((stats.quota_used / stats.quota) * 100, 100) : 0;

  return (
    <DashboardLayout>
      <div data-testid={DASHBOARD.page}>
        {/* Welcome */}
        <motion.div variants={fade} initial="hidden" animate="show" className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Bun venit înapoi</p>
            <h1 className="font-heading text-4xl sm:text-5xl font-extrabold mt-1">Salut, {user?.name?.split(" ")[0] || "Antrenor"} 👋</h1>
            <p className="text-zinc-500 mt-2 text-sm">Iată ce se întâmplă cu conținutul tău astăzi.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate("/projects")}
              className="flex items-center gap-2 px-4 py-3 rounded-lg bg-zinc-900 border border-white/10 text-white font-medium hover:bg-zinc-800 transition-colors text-sm"
            >
              <Clapperboard className="w-4 h-4" aria-hidden="true" /> Proiecte
            </button>
            <button
              data-testid={DASHBOARD.newProjectButton}
              onClick={() => navigate("/projects?new=1")}
              className="flex items-center gap-2 px-5 py-3 rounded-lg bg-[#C4F601] text-black font-bold hover:bg-[#A6D300] transition-colors"
            >
              <Plus className="w-5 h-5" aria-hidden="true" /> Proiect nou
            </button>
          </div>
        </motion.div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-[#18181B] border border-white/10 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatCard index={0} testid={DASHBOARD.statTotal} icon={Clapperboard} label="Total reels" value={stats?.total_projects ?? 0} sub="proiecte create" />
              <StatCard index={1} testid={DASHBOARD.statMonth} icon={Calendar} label="Luna aceasta" value={stats?.this_month ?? 0} sub="reels lansate" />
              <StatCard index={2} testid={DASHBOARD.statApproved} icon={CheckCircle2} label="Aprobate" value={stats?.approved ?? 0} sub="gata de postat" />
              <StatCard index={3} testid={DASHBOARD.statQuota} icon={Clock} label="Timp economisit" value={fmtTime(stats?.time_saved_min || 0)} sub="vs editare manuală" isTime />
            </div>

            {/* Bento: recent + side widgets */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Recent reels */}
              <motion.div custom={4} variants={fade} initial="hidden" animate="show" className="lg:col-span-2 bg-[#18181B] border border-white/10 rounded-xl">
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                  <h2 className="font-heading text-lg font-bold flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#C4F601]" aria-hidden="true" /> Reels recente
                  </h2>
                  <button onClick={() => navigate("/projects")} className="text-sm text-[#C4F601] hover:underline flex items-center gap-1">
                    Vezi toate <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
                <div data-testid={DASHBOARD.recentList}>
                  {recent.length === 0 ? (
                    <div className="px-6 py-16 text-center">
                      <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-white/5 flex items-center justify-center mx-auto mb-4">
                        <Clapperboard className="w-7 h-7 text-zinc-600" aria-hidden="true" />
                      </div>
                      <p className="text-zinc-300 font-medium">Niciun reel încă</p>
                      <p className="text-sm text-zinc-500 mt-1 mb-5">Încarcă primul clip și lasă AI-ul să monteze.</p>
                      <button onClick={() => navigate("/projects?new=1")} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#C4F601] text-black font-bold hover:bg-[#A6D300] transition-colors text-sm">
                        <UploadCloud className="w-4 h-4" aria-hidden="true" /> Încarcă video
                      </button>
                    </div>
                  ) : (
                    recent.map((p, i) => {
                      const s = STATUS_LABEL[p.status] || STATUS_LABEL.uploaded;
                      return (
                        <button key={p.id} onClick={() => navigate(`/projects/${p.id}`)} className="w-full flex items-center gap-4 px-6 py-3.5 border-b border-white/5 last:border-0 hover:bg-zinc-800/50 transition-colors text-left">
                          <div className="w-11 h-11 rounded-lg bg-zinc-900 border border-white/5 flex items-center justify-center shrink-0">
                            <Clapperboard className="w-5 h-5 text-zinc-600" aria-hidden="true" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold truncate">{p.title}</div>
                            <div className="text-xs text-zinc-500">{p.theme}</div>
                          </div>
                          <span className={`text-[11px] font-medium px-3 py-1 rounded-full ${s.c} shrink-0`}>{s.t}</span>
                        </button>
                      );
                    })
                  )}
                </div>
              </motion.div>

              {/* Side widgets */}
              <div className="space-y-6">
                {/* Subscription */}
                <motion.div custom={5} variants={fade} initial="hidden" animate="show" className="bg-[#18181B] border border-white/10 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">Abonament</span>
                    <CreditCard className="w-4 h-4 text-[#C4F601]" aria-hidden="true" />
                  </div>
                  <div className="font-heading text-2xl font-bold">{stats?.plan_name || "Fără abonament"}</div>

                  <div className="mt-5">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-zinc-400 flex items-center gap-1"><Zap className="w-3.5 h-3.5 text-[#C4F601]" aria-hidden="true" /> Reels-uri rămase</span>
                      <span className="text-white font-medium">{stats?.credits_remaining ?? 0} / {stats?.quota ?? 0}</span>
                    </div>
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <motion.div className="h-full bg-[#C4F601]" initial={{ width: 0 }} animate={{ width: `${quotaPct}%` }} transition={{ duration: 0.8, ease: "easeOut" }} />
                    </div>
                  </div>

                  <button onClick={() => navigate("/billing")} className="w-full mt-5 py-2.5 rounded-lg bg-zinc-900 border border-white/10 text-white text-sm font-medium hover:bg-zinc-800 transition-colors">
                    Gestionează planul
                  </button>
                </motion.div>

                {/* AI tip */}
                <motion.div custom={6} variants={fade} initial="hidden" animate="show" className="bg-gradient-to-br from-[#1a1c12] to-[#18181B] border border-[#C4F601]/20 rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="w-4 h-4 text-[#C4F601]" aria-hidden="true" />
                    <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#C4F601]">Sfat AI</span>
                  </div>
                  <p className="text-sm text-zinc-300 leading-relaxed">{tip}</p>
                </motion.div>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
