import { Link, useLocation, useNavigate } from "react-router-dom";
import { ClipboardList, GraduationCap, LayoutDashboard, LogOut, MessageSquareQuote, ReceiptText, Users, Video } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";

const items = [
  { label: "Dashboard", icon: LayoutDashboard, to: ROUTES.ADMIN.DASHBOARD },
  { label: "Users", icon: Users, to: ROUTES.ADMIN.USERS },
  { label: "Requests", icon: ClipboardList, to: ROUTES.ADMIN.REQUESTS },
  { label: "Sessions", icon: Video, to: ROUTES.ADMIN.SESSIONS },
  { label: "Payments", icon: ReceiptText, to: ROUTES.ADMIN.PAYMENTS },
  { label: "Reviews", icon: MessageSquareQuote, to: ROUTES.ADMIN.REVIEWS },
];

export function AdminSidebar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  function handleLogout() {
    logout();
    navigate(ROUTES.LOGIN);
  }

  return (
    <aside className="w-64 h-full flex-shrink-0 flex flex-col border-r border-[#27272A] bg-[#121214] z-40 px-lg py-lg">
      <div className="mb-xl flex items-center gap-sm">
        <div className="flex size-10 items-center justify-center rounded-xl border border-[#8b5cf6]/20 bg-[#8b5cf6]/10 text-[#8b5cf6]">
          <GraduationCap className="size-5" />
        </div>
        <div>
          <p className="text-headline-md text-zinc-100">EduMatch</p>
          <p className="max-w-[180px] truncate text-body-sm text-zinc-400">{user?.full_name ?? "Admin Console"}</p>
        </div>
      </div>

      <nav className="flex min-h-0 flex-1 flex-col">
        <div className="space-y-xs">
          {items.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
            return (
              <Link
                className={cn("flex h-11 w-full items-center gap-sm rounded-lg px-md text-body-sm transition-colors", active ? "bg-[#8b5cf6]/10 text-[#8b5cf6] border border-[#8b5cf6]/20 shadow-[0_0_15px_rgba(139,92,246,0.1)]" : "text-zinc-400 hover:text-zinc-100 hover:bg-white/5")}
                key={item.label}
                to={item.to}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </div>

        <button className="mt-auto flex h-11 w-full items-center gap-sm rounded-lg px-md text-body-sm text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300" onClick={handleLogout} type="button">
          <LogOut className="size-4" />
          Logout
        </button>
      </nav>
    </aside>
  );
}
