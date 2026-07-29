import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import { BILLING } from "@/constants/testIds";
import { STRIPE_PLANS } from "@/config/integration";
import { Check, Zap, Crown, Building2, ExternalLink } from "lucide-react";

const ICONS_FALLBACK = Zap;
function iconFor(key) {
  if (key.startsWith("gymstudio")) return Building2;
  if (key.startsWith("coachplus") || key.startsWith("coachpro")) return Crown;
  return ICONS_FALLBACK;
}

export default function Billing() {
  const { user } = useAuth();

  const subscribe = (url) => {
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <DashboardLayout>
      <div data-testid={BILLING.page} className="animate-fade-up">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Planuri & facturare</p>
        <h1 className="font-heading text-4xl sm:text-5xl font-extrabold mt-1 mb-2">Abonament</h1>
        <p className="text-zinc-400 mb-8">Alege planul potrivit pentru volumul tău de conținut. Plata se face securizat prin Stripe.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {STRIPE_PLANS.map((p) => {
            const Icon = iconFor(p.key);
            const active = user?.plan_name === p.name || user?.plan === p.key;
            return (
              <div
                key={p.key}
                data-testid={BILLING.planCard}
                className={`relative bg-[#18181B] border rounded-xl p-6 flex flex-col ${p.highlight ? "border-[#C4F601]/60" : "border-white/10"}`}
              >
                {p.badge && <span className="absolute -top-3 left-6 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-[#C4F601] text-black">{p.badge}</span>}
                <div className="flex items-center gap-2 mb-4">
                  <Icon className="w-5 h-5 text-[#C4F601]" aria-hidden="true" />
                  <h3 className="font-heading text-xl font-bold">{p.name}</h3>
                </div>
                <div className="mb-6">
                  <span className="font-heading text-3xl font-extrabold">{p.price.toLocaleString("ro-RO")}</span>
                  <span className="text-zinc-500 text-sm"> lei / lună</span>
                </div>
                <ul className="space-y-2.5 mb-6 flex-1">
                  {(p.features || []).map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                      <Check className="w-4 h-4 text-[#C4F601] mt-0.5 shrink-0" aria-hidden="true" /> {f}
                    </li>
                  ))}
                </ul>
                <button
                  data-testid={BILLING.subscribeButton}
                  onClick={() => subscribe(p.url)}
                  disabled={active}
                  className={`w-full py-3 rounded-lg font-bold uppercase tracking-wide transition-colors flex items-center justify-center gap-2 ${
                    active ? "bg-zinc-800 text-zinc-500 cursor-default"
                      : p.highlight ? "bg-[#C4F601] text-black hover:bg-[#A6D300]"
                      : "bg-zinc-900 border border-white/10 text-white hover:bg-zinc-800"
                  }`}
                >
                  {active ? "Plan activ" : <>Abonează-te <ExternalLink className="w-4 h-4" aria-hidden="true" /></>}
                </button>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-zinc-600 mt-6">Linkurile deschid pagina securizată Stripe (mod LIVE). Prețurile includ TVA.</p>
      </div>
    </DashboardLayout>
  );
}
