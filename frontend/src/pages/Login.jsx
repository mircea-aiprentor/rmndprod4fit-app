import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import api, { formatApiError } from "@/lib/api";
import { LOGIN } from "@/constants/testIds";
import { Dumbbell, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function Login() {
  const { applyAuth } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { email, password });
      applyAuth(data);
      toast.success("Bine ai revenit!");
      navigate("/dashboard");
    } catch (err) {
      setError(formatApiError(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-[#09090B]">
      <div className="hidden lg:flex flex-col justify-between p-12 relative overflow-hidden border-r border-white/10">
        <div className="absolute inset-0 grain-bg" aria-hidden="true" />
        <div className="relative flex items-center gap-2">
          <div className="w-9 h-9 rounded-md bg-[#C4F601] flex items-center justify-center">
            <Dumbbell className="w-5 h-5 text-black" aria-hidden="true" />
          </div>
          <span className="font-heading font-black text-xl tracking-tighter uppercase">ElvisPro Cut</span>
        </div>
        <div className="relative">
          <h1 className="font-heading text-5xl font-black tracking-tighter uppercase leading-[0.95]">
            Transformă filmările brute în <span className="text-[#C4F601]">Reels gata de postat.</span>
          </h1>
          <p className="mt-6 text-zinc-400 max-w-md leading-relaxed">
            Încarci clipurile, AI-ul montează — 9:16, subtitrări, hook și CTA. Tu doar aprobi și postezi.
          </p>
        </div>
        <div className="relative text-xs uppercase tracking-[0.2em] text-zinc-600">Panou Antrenor · 2026</div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12">
        <form onSubmit={submit} className="w-full max-w-sm animate-fade-up">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-9 h-9 rounded-md bg-[#C4F601] flex items-center justify-center">
              <Dumbbell className="w-5 h-5 text-black" aria-hidden="true" />
            </div>
            <span className="font-heading font-black text-xl tracking-tighter uppercase">ElvisPro Cut</span>
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Panou Antrenor</p>
          <h2 className="font-heading text-3xl font-black tracking-tight uppercase mt-2 mb-8">Autentificare</h2>

          {error && (
            <div className="flex items-start gap-2 mb-5 p-3 rounded-md bg-red-500/10 border border-red-500/30 text-red-300 text-sm" data-testid="login-error">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <label className="block text-xs font-bold uppercase tracking-[0.15em] text-zinc-500 mb-2">Email</label>
          <input
            data-testid={LOGIN.emailInput}
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 mb-5 rounded-md bg-zinc-900 border border-white/10 text-white placeholder-zinc-600 focus:outline-none focus:border-[#C4F601] focus:ring-1 focus:ring-[#C4F601] transition-colors"
            placeholder="antrenor@exemplu.ro"
          />

          <label className="block text-xs font-bold uppercase tracking-[0.15em] text-zinc-500 mb-2">Parolă</label>
          <input
            data-testid={LOGIN.passwordInput}
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 mb-6 rounded-md bg-zinc-900 border border-white/10 text-white placeholder-zinc-600 focus:outline-none focus:border-[#C4F601] focus:ring-1 focus:ring-[#C4F601] transition-colors"
            placeholder="••••••••"
          />

          <button
            data-testid={LOGIN.submitButton}
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-md bg-[#C4F601] text-black font-bold uppercase tracking-wide hover:bg-[#A6D300] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
            Intră în cont
          </button>

          <button
            type="button"
            onClick={() => toast("Autentificarea cu Google vine în curând.")}
            className="w-full py-3 mt-3 rounded-md bg-zinc-900 border border-white/10 text-white font-medium hover:bg-zinc-800 transition-colors"
          >
            Continuă cu Google
          </button>

          <p className="mt-6 text-sm text-zinc-500 text-center">
            Nu ai cont?{" "}
            <Link data-testid={LOGIN.registerLink} to="/register" className="text-[#C4F601] hover:underline font-medium">
              Creează unul
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
