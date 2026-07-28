import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import api, { formatApiError } from "@/lib/api";
import { REGISTER } from "@/constants/testIds";
import { Dumbbell, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function Register() {
  const { applyAuth } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const upd = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirm) {
      setError("Parolele nu coincid.");
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post("/auth/register", { name: form.name, email: form.email, password: form.password });
      applyAuth(data);
      toast.success("Cont creat cu succes!");
      navigate("/dashboard");
    } catch (err) {
      setError(formatApiError(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    "w-full px-4 py-3 rounded-md bg-zinc-900 border border-white/10 text-white placeholder-zinc-600 focus:outline-none focus:border-[#C4F601] focus:ring-1 focus:ring-[#C4F601] transition-colors";
  const labelCls = "block text-xs font-bold uppercase tracking-[0.15em] text-zinc-500 mb-2";

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#09090B] grain-bg">
      <form onSubmit={submit} className="w-full max-w-sm animate-fade-up">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-md bg-[#C4F601] flex items-center justify-center">
            <Dumbbell className="w-5 h-5 text-black" aria-hidden="true" />
          </div>
          <span className="font-heading font-black text-xl tracking-tighter uppercase">ElvisPro Cut</span>
        </div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Panou Antrenor</p>
        <h2 className="font-heading text-3xl font-black tracking-tight uppercase mt-2 mb-8">Creează cont</h2>

        {error && (
          <div className="flex items-start gap-2 mb-5 p-3 rounded-md bg-red-500/10 border border-red-500/30 text-red-300 text-sm" data-testid="register-error">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <label className={labelCls}>Nume</label>
        <input data-testid={REGISTER.nameInput} required value={form.name} onChange={upd("name")} className={inputCls + " mb-5"} placeholder="Elvis Antrenor" />

        <label className={labelCls}>Email</label>
        <input data-testid={REGISTER.emailInput} type="email" required value={form.email} onChange={upd("email")} className={inputCls + " mb-5"} placeholder="antrenor@exemplu.ro" />

        <label className={labelCls}>Parolă</label>
        <input data-testid={REGISTER.passwordInput} type="password" required value={form.password} onChange={upd("password")} className={inputCls + " mb-5"} placeholder="min. 6 caractere" />

        <label className={labelCls}>Confirmă parola</label>
        <input data-testid={REGISTER.passwordConfirmInput} type="password" required value={form.confirm} onChange={upd("confirm")} className={inputCls + " mb-6"} placeholder="••••••••" />

        <button
          data-testid={REGISTER.submitButton}
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-md bg-[#C4F601] text-black font-bold uppercase tracking-wide hover:bg-[#A6D300] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
          Creează cont
        </button>

        <p className="mt-6 text-sm text-zinc-500 text-center">
          Ai deja cont?{" "}
          <Link data-testid={REGISTER.loginLink} to="/login" className="text-[#C4F601] hover:underline font-medium">
            Autentifică-te
          </Link>
        </p>
      </form>
    </div>
  );
}
