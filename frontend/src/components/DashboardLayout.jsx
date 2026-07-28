import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { NAV, LOGOUT } from "@/constants/testIds";
import { LayoutDashboard, Clapperboard, CreditCard, LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import Logo from "@/components/Logo";

const links = [
  { to: "/dashboard", label: "Panou", icon: LayoutDashboard, testid: NAV.linkDashboard },
  { to: "/projects", label: "Proiecte Reels", icon: Clapperboard, testid: NAV.linkProjects },
  { to: "/billing", label: "Abonament", icon: CreditCard, testid: NAV.linkBilling },
];

export default function DashboardLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const doLogout = () => {
    logout();
    navigate("/login");
  };

  const SidebarInner = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center px-6 h-20 border-b border-white/10">
        <Logo size={40} />
      </div>
      <nav className="flex-1 px-3 py-6 space-y-1">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            data-testid={l.testid}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? "bg-[#C4F601] text-black"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
              }`
            }
          >
            <l.icon className="w-5 h-5" aria-hidden="true" />
            {l.label}
          </NavLink>
        ))}
      </nav>
      <div className="px-3 py-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-4 py-2 mb-2">
          <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-bold text-[#C4F601]">
            {(user?.name || "A").charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">{user?.name}</div>
            <div className="text-xs text-zinc-500 truncate">{user?.plan_name || "Fără abonament"}</div>
          </div>
        </div>
        <button
          data-testid={LOGOUT.button}
          onClick={doLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
        >
          <LogOut className="w-5 h-5" aria-hidden="true" />
          Deconectare
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#09090B] grain-bg">
      {/* Desktop sidebar */}
      <aside data-testid={NAV.sidebar} className="hidden lg:flex fixed inset-y-0 left-0 w-64 bg-[#0f0f11] border-r border-white/10 flex-col z-30">
        <SidebarInner />
      </aside>

      {/* Mobile header */}
      <div className="lg:hidden sticky top-0 z-40 flex items-center justify-between h-16 px-4 bg-[#0f0f11] border-b border-white/10">
        <Logo size={34} subtitle={null} />
        <button data-testid={NAV.mobileToggle} onClick={() => setOpen(!open)} className="p-2 text-white">
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-40" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/70" />
          <aside className="absolute inset-y-0 left-0 w-72 bg-[#0f0f11] border-r border-white/10" onClick={(e) => e.stopPropagation()}>
            <SidebarInner />
          </aside>
        </div>
      )}

      <main className="lg:pl-64">
        <div className="max-w-7xl mx-auto p-5 sm:p-8">{children}</div>
      </main>
    </div>
  );
}
