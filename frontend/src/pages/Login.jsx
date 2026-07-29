import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { loginWithPin } from "@/services/elvispro";
import { LOGIN } from "@/constants/testIds";
import { Loader2, AlertCircle, Delete } from "lucide-react";
import { toast } from "sonner";
import Logo from "@/components/Logo";

const PIN_LENGTH = 4;

export default function Login() {
  const { applyAuth } = useAuth();
  const navigate = useNavigate();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const hiddenRef = useRef();

  const submit = async (value) => {
    setError("");
    setLoading(true);
    try {
      const trainer = await loginWithPin(value);
      applyAuth(trainer);
      toast.success(`Bine ai venit, ${trainer.name?.split(" ")[0] || "Antrenor"}!`);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "PIN invalid");
      setPin("");
    } finally {
      setLoading(false);
    }
  };

  const addDigit = (d) => {
    if (loading || pin.length >= PIN_LENGTH) return;
    const next = pin + d;
    setPin(next);
    if (next.length === PIN_LENGTH) submit(next);
  };
  const backspace = () => setPin((p) => p.slice(0, -1));

  const onHiddenChange = (e) => {
    const v = e.target.value.replace(/\D/g, "").slice(0, PIN_LENGTH);
    setPin(v);
    if (v.length === PIN_LENGTH) submit(v);
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-[#09090B]">
      {/* Left brand panel */}
      <div className="hidden lg:flex flex-col justify-between p-12 relative overflow-hidden border-r border-white/10">
        <div className="absolute inset-0 grain-bg" aria-hidden="true" />
        <div className="relative"><Logo size={44} subtitle={null} /></div>
        <div className="relative">
          <h1 className="font-heading text-5xl font-extrabold leading-[0.98]">
            Transformă filmările brute în <span className="text-[#C4F601]">Reels gata de postat.</span>
          </h1>
          <p className="mt-6 text-zinc-400 max-w-md leading-relaxed">
            Încarci clipurile, motorul montează — 9:16, subtitrări, hook și CTA. Tu doar aprobi și postezi.
          </p>
        </div>
        <div className="relative text-xs uppercase tracking-[0.2em] text-zinc-600">Panou Antrenor · 2026</div>
      </div>

      {/* PIN pad */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-xs animate-fade-up">
          <div className="lg:hidden mb-8"><Logo size={40} subtitle={null} /></div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Panou Antrenor</p>
          <h2 className="font-heading text-3xl font-extrabold mt-2 mb-2">Autentificare</h2>
          <p className="text-zinc-500 text-sm mb-8">Introdu codul PIN de antrenor.</p>

          {error && (
            <div className="flex items-center gap-2 mb-5 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm" data-testid="login-error">
              <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" /> <span>{error}</span>
            </div>
          )}

          {/* PIN dots */}
          <div
            className="flex justify-center gap-4 mb-8 cursor-text"
            onClick={() => hiddenRef.current?.focus()}
            data-testid="login-pin-display"
          >
            {Array.from({ length: PIN_LENGTH }).map((_, i) => (
              <div
                key={i}
                className={`w-4 h-4 rounded-full border-2 transition-colors ${
                  loading ? "border-[#C4F601] animate-pulse"
                    : i < pin.length ? "bg-[#C4F601] border-[#C4F601]" : "border-zinc-600"
                }`}
              />
            ))}
          </div>

          {/* hidden input for keyboard + testing */}
          <input
            ref={hiddenRef}
            data-testid={LOGIN.pinInput}
            type="password"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={pin}
            onChange={onHiddenChange}
            maxLength={PIN_LENGTH}
            className="sr-only"
            aria-label="Cod PIN"
          />

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
              <button
                key={n}
                type="button"
                data-testid={`pin-key-${n}`}
                onClick={() => addDigit(String(n))}
                disabled={loading}
                className="h-14 rounded-xl bg-zinc-900 border border-white/10 text-white text-xl font-heading font-bold hover:bg-zinc-800 hover:border-[#C4F601]/40 active:scale-95 transition-all disabled:opacity-50"
              >
                {n}
              </button>
            ))}
            <div />
            <button
              type="button"
              data-testid="pin-key-0"
              onClick={() => addDigit("0")}
              disabled={loading}
              className="h-14 rounded-xl bg-zinc-900 border border-white/10 text-white text-xl font-heading font-bold hover:bg-zinc-800 hover:border-[#C4F601]/40 active:scale-95 transition-all disabled:opacity-50"
            >
              0
            </button>
            <button
              type="button"
              data-testid="pin-key-backspace"
              onClick={backspace}
              disabled={loading || pin.length === 0}
              className="h-14 rounded-xl bg-zinc-900 border border-white/10 text-zinc-400 hover:bg-zinc-800 flex items-center justify-center active:scale-95 transition-all disabled:opacity-40"
              aria-label="Șterge"
            >
              <Delete className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          {loading && (
            <div className="flex items-center justify-center gap-2 mt-6 text-sm text-zinc-500" data-testid="login-loading">
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Se verifică...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
