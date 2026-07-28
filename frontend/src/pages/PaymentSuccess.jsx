import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

export default function PaymentSuccess() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [state, setState] = useState("checking"); // checking | ok | fail
  const sessionId = params.get("session_id");

  useEffect(() => {
    if (!sessionId) { setState("fail"); return; }
    let tries = 0;
    const poll = async () => {
      try {
        const { data } = await api.get(`/payments/status/${sessionId}`);
        if (data.payment_status === "paid") {
          setState("ok");
          refreshUser();
          return;
        }
        if (["expired", "failed"].includes(data.payment_status)) { setState("fail"); return; }
      } catch { /* retry */ }
      if (tries++ < 12) setTimeout(poll, 2000);
      else setState("fail");
    };
    poll();
    // eslint-disable-next-line
  }, [sessionId]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#09090B] grain-bg">
      <div className="bg-[#18181B] border border-white/10 rounded-md p-10 max-w-md w-full text-center animate-fade-up">
        {state === "checking" && (
          <>
            <Loader2 className="w-12 h-12 text-[#C4F601] animate-spin mx-auto mb-4" aria-hidden="true" />
            <h1 className="font-heading text-2xl font-bold uppercase tracking-tight">Confirmăm plata...</h1>
            <p className="text-zinc-400 mt-2">Un moment, verificăm cu Stripe.</p>
          </>
        )}
        {state === "ok" && (
          <>
            <CheckCircle2 className="w-14 h-14 text-[#C4F601] mx-auto mb-4" aria-hidden="true" />
            <h1 className="font-heading text-3xl font-black uppercase tracking-tighter">Abonament activ!</h1>
            <p className="text-zinc-400 mt-2 mb-6">Mulțumim! Contul tău a fost actualizat.</p>
            <button onClick={() => navigate("/dashboard")} className="w-full py-3 rounded-md bg-[#C4F601] text-black font-bold uppercase tracking-wide hover:bg-[#A6D300] transition-colors">
              Mergi la panou
            </button>
          </>
        )}
        {state === "fail" && (
          <>
            <XCircle className="w-14 h-14 text-red-400 mx-auto mb-4" aria-hidden="true" />
            <h1 className="font-heading text-2xl font-bold uppercase tracking-tight">Plata nu a fost confirmată</h1>
            <p className="text-zinc-400 mt-2 mb-6">Dacă ai fost taxat, contactează-ne. Poți reîncerca oricând.</p>
            <button onClick={() => navigate("/billing")} className="w-full py-3 rounded-md bg-zinc-900 border border-white/10 text-white font-medium hover:bg-zinc-800 transition-colors">
              Înapoi la abonamente
            </button>
          </>
        )}
      </div>
    </div>
  );
}
