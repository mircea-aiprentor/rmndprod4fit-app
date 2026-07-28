export default function Logo({ size = 40, showText = true, subtitle = "Panou Antrenor" }) {
  return (
    <div className="flex items-center gap-2.5">
      <img
        src="/logo.jpeg"
        alt="ElvisPro Cut"
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className="rounded-lg object-cover border border-white/10 shrink-0"
      />
      {showText && (
        <div className="leading-none">
          <div className="font-heading font-extrabold text-[15px] tracking-tight">
            ELVIS<span className="text-[#C4F601]">PRO</span> CUT
          </div>
          {subtitle && (
            <div className="text-[10px] uppercase tracking-[0.22em] text-zinc-500 mt-1">{subtitle}</div>
          )}
        </div>
      )}
    </div>
  );
}
