import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  CalendarClock,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  MessageSquareText,
  Plus,
  Search,
  Settings,
  User,
  WalletCards,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { ROUTES } from "@/lib/routes";

const primaryItems = [
  { label: "Dashboard", icon: LayoutDashboard, to: "/student/dashboard" },
  { label: "Create Request", icon: Plus, to: "/student/requests/create" },
  { label: "My Requests", icon: FileText, to: "/student/requests" },
  { label: "Browse Instructors", icon: Search, to: "/student/instructors" },
  { label: "Chat", icon: MessageSquareText, to: "/student/chat" },
  { label: "Sessions", icon: CalendarClock, to: "/student/sessions" },
  { label: "Payments", icon: WalletCards, to: "/student/payments" },
];

const accountItems = [
  { label: "Profile", icon: User, to: "/student/profile" },
  { label: "Settings", icon: Settings, to: "/student/settings" },
];

function isActivePath(pathname: string, to: string) {
  if (to === "/student/requests/create") {
    return pathname === to;
  }

  if (to === "/student/requests") {
    return pathname === to || (pathname.startsWith("/student/requests/") && pathname !== "/student/requests/create");
  }

  return pathname === to || pathname.startsWith(`${to}/`);
}

export function StudentSidebar() {
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
          <p className="max-w-[180px] truncate text-body-sm text-zinc-400">
            {user?.full_name ?? "Academic Portal"}
          </p>
        </div>
      </div>

      <nav className="flex min-h-0 flex-1 flex-col">
        <div className="space-y-xs">
          {primaryItems.map((item) => {
            const Icon = item.icon;
            const active = isActivePath(pathname, item.to);

            return (
              <Link
                className={cn(
                  "flex h-11 w-full items-center gap-sm rounded-lg px-md text-body-sm transition-colors",
                  active
                    ? "bg-[#8b5cf6]/10 text-[#8b5cf6] border border-[#8b5cf6]/20 shadow-[0_0_15px_rgba(139,92,246,0.1)]"
                    : "text-zinc-400 hover:text-zinc-100 hover:bg-white/5",
                )}
                key={item.label}
                to={item.to}
              >
                <Icon className="size-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="mt-auto rounded-2xl border border-[#27272A] bg-[#18181B] p-sm">
          {accountItems.map((item) => {
            const Icon = item.icon;
            const active = isActivePath(pathname, item.to);

            return (
              <Link
                className={cn(
                  "flex h-11 w-full items-center gap-sm rounded-lg px-md text-body-sm transition-colors",
                  active
                    ? "bg-[#8b5cf6]/10 text-[#8b5cf6] border border-[#8b5cf6]/20 shadow-[0_0_15px_rgba(139,92,246,0.1)]"
                    : "text-zinc-400 hover:text-zinc-100 hover:bg-white/5",
                )}
                key={item.label}
                to={item.to}
              >
                <Icon className="size-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
          <button
            className="mt-xs flex h-11 w-full items-center gap-sm rounded-lg px-md text-body-sm text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
            onClick={handleLogout}
            type="button"
          >
            <LogOut className="size-4" />
            <span>Logout</span>
          </button>
        </div>
      </nav>
    </aside>
  );
}
