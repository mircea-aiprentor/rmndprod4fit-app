import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { DASHBOARD } from "@/constants/testIds";
import { Clapperboard, CheckCircle2, Calendar, Gauge, Plus, ArrowRight, Loader2 } from "lucide-react";

const STATUS_LABEL = {
  uploaded: { t: "Încărcat", c: "text-zinc-400 bg-zinc-800" },
  processing: { t: "Procesare AI", c: "text-blue-300 bg-blue-500/15" },
  review: { t: "Așteaptă review", c: "text-amber-300 bg-amber-500/15" },
  approved: { t: "Aprobat", c: "text-[#C4F601] bg-[#C4F601]/15" },
};

function StatCard({ icon: Icon, label, value, sub, testid }) {
  return (
    <div data-testid={testid} className="bg-[#18181B] border border-white/10 rounded-md p-6 hover:border-white/20 transition-colors">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">{label}</span>
        <Icon className="w-5 h-5 text-[#C4F601]" aria-hidden="true" />
      </div>
      <div className="font-heading text-4xl font-black tracking-tighter">{value}</div>
      {sub && <div className="text-xs text-zinc-500 mt-1">{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get("/dashboard/stats"), api.get("/projects")])
      .then(([s, p]) => {
        setStats(s.data);
        setRecent(p.data.slice(0, 5));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout>
      <div data-testid={DASHBOARD.page} className="animate-fade-up">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Bun venit înapoi</p>
            <h1 className="font-heading text-4xl sm:text-5xl font-black tracking-tighter uppercase mt-1">{user?.name?.split(" ")[0] || "Antrenor"}</h1>
          </div>
          <button
            data-testid={DASHBOARD.newProjectButton}
            onClick={() => navigate("/projects?new=1")}
            className="flex items-center gap-2 px-5 py-3 rounded-md bg-[#C4F601] text-black font-bold uppercase tracking-wide hover:bg-[#A6D300] transition-colors"
          >
            <Plus className="w-5 h-5" aria-hidden="true" /> Proiect nou
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-[#C4F601] animate-spin" /></div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard testid={DASHBOARD.statTotal} icon={Clapperboard} label="Total reels" value={stats?.total_projects ?? 0} sub="proiecte create" />
              <StatCard testid={DASHBOARD.statMonth} icon={Calendar} label="Luna aceasta" value={stats?.this_month ?? 0} sub="reels lansate" />
              <StatCard testid={DASHBOARD.statApproved} icon={CheckCircle2} label="Aprobate" value={stats?.approved ?? 0} sub="gata de postat" />
              <StatCard testid={DASHBOARD.statQuota} icon={Gauge} label="Cotă lunară" value={`${stats?.quota_used ?? 0}/${stats?.quota ?? 0}`} sub={stats?.plan_name || "Fără abonament"} />
            </div>

            <div className="bg-[#18181B] border border-white/10 rounded-md">
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                <h2 className="font-heading text-xl font-bold tracking-tight uppercase">Proiecte recente</h2>
                <button onClick={() => navigate("/projects")} className="text-sm text-[#C4F601] hover:underline flex items-center gap-1">
                  Vezi toate <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
              <div data-testid={DASHBOARD.recentList}>
                {recent.length === 0 ? (
                  <div className="px-6 py-14 text-center">
                    <Clapperboard className="w-10 h-10 text-zinc-700 mx-auto mb-3" aria-hidden="true" />
                    <p className="text-zinc-500">Niciun proiect încă. Încarcă primul tău clip.</p>
                  </div>
                ) : (
                  recent.map((p) => {
                    const s = STATUS_LABEL[p.status] || STATUS_LABEL.uploaded;
                    return (
                      <button
                        key={p.id}
                        onClick={() => navigate(`/projects/${p.id}`)}
                        className="w-full flex items-center justify-between px-6 py-4 border-b border-white/5 last:border-0 hover:bg-zinc-800/50 transition-colors text-left"
                      >
                        <div className="min-w-0">
                          <div className="font-semibold truncate">{p.title}</div>
                          <div className="text-xs text-zinc-500">{p.theme}</div>
                        </div>
                        <span className={`text-xs font-medium px-3 py-1 rounded-full ${s.c} shrink-0`}>{s.t}</span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
