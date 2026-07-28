import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { BILLING } from "@/constants/testIds";
import { Check, Loader2, Zap, Crown, Building2 } from "lucide-react";
import { toast } from "sonner";

const FEATURES = {
  coach_monthly: ["9 reels / lună", "Auto-editare 3–5 min", "Subtitrări automate", "Export 1080p", "Istoric proiecte"],
  coach_plus_monthly: ["25 reels / lună", "Retuș uman pe fiecare video", "Cereri implementate manual", "Variante ajutătoare", "Suport prioritar"],
  gym_studio_monthly: ["Până la 5 antrenori", "Panou de administrare", "25 reels finisate pro / lună", "Facturare unică", "Onboarding dedicat"],
};
const ICONS = { coach_monthly: Zap, coach_plus_monthly: Crown, gym_studio_monthly: Building2 };

export default function Billing() {
  const { user, refreshUser } = useAuth();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    api.get("/plans").then((r) => setPlans(r.data)).catch(() => {}).finally(() => setLoading(false));
    refreshUser();
    // eslint-disable-next-line
  }, []);

  const subscribe = async (lookup_key) => {
    setBusy(lookup_key);
    try {
      const { data } = await api.post("/payments/checkout", { lookup_key, origin_url: window.location.origin });
      window.location.href = data.checkout_url;
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Nu s-a putut iniția plata.");
      setBusy(null);
    }
  };

  return (
    <DashboardLayout>
      <div data-testid={BILLING.page} className="animate-fade-up">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Planuri & facturare</p>
        <h1 className="font-heading text-4xl sm:text-5xl font-black tracking-tighter uppercase mt-1 mb-2">Abonament</h1>
        <p className="text-zinc-400 mb-8">Alege planul potrivit pentru volumul tău de conținut. Plată securizată prin Stripe.</p>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-[#C4F601] animate-spin" /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {plans.map((p) => {
              const Icon = ICONS[p.lookup_key] || Zap;
              const active = user?.plan === p.lookup_key;
              const highlight = p.lookup_key === "coach_plus_monthly";
              return (
                <div
                  key={p.lookup_key}
                  data-testid={BILLING.planCard}
                  className={`relative bg-[#18181B] border rounded-md p-6 flex flex-col ${highlight ? "border-[#C4F601]/60" : "border-white/10"}`}
                >
                  {highlight && <span className="absolute -top-3 left-6 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-[#C4F601] text-black">Popular</span>}
                  <div className="flex items-center gap-2 mb-4">
                    <Icon className="w-5 h-5 text-[#C4F601]" aria-hidden="true" />
                    <h3 className="font-heading text-2xl font-bold tracking-tight uppercase">{p.name}</h3>
                  </div>
                  <div className="mb-6">
                    <span className="font-heading text-4xl font-black tracking-tighter">{p.amount}</span>
                    <span className="text-zinc-500 text-sm"> {p.currency} / lună</span>
                  </div>
                  <ul className="space-y-3 mb-6 flex-1">
                    {(FEATURES[p.lookup_key] || []).map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                        <Check className="w-4 h-4 text-[#C4F601] mt-0.5 shrink-0" aria-hidden="true" /> {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    data-testid={BILLING.subscribeButton}
                    onClick={() => subscribe(p.lookup_key)}
                    disabled={active || busy === p.lookup_key}
                    className={`w-full py-3 rounded-md font-bold uppercase tracking-wide transition-colors flex items-center justify-center gap-2 ${
                      active
                        ? "bg-zinc-800 text-zinc-500 cursor-default"
                        : highlight
                        ? "bg-[#C4F601] text-black hover:bg-[#A6D300]"
                        : "bg-zinc-900 border border-white/10 text-white hover:bg-zinc-800"
                    }`}
                  >
                    {busy === p.lookup_key && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
                    {active ? "Plan activ" : "Abonează-te"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
        <p className="text-xs text-zinc-600 mt-6">Card de test: 4242 4242 4242 4242 · orice dată viitoare · orice CVC.</p>
      </div>
    </DashboardLayout>
  );
}
