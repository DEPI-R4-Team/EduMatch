import { Link } from "react-router-dom";
import { Plus, Search, WalletCards } from "lucide-react";

const actions = [
  { label: "Create New Request", to: "/student/requests/create", icon: Plus },
  { label: "Browse Instructors", to: "/student/instructors", icon: Search },
  { label: "View Payments", to: "/student/payments", icon: WalletCards },
];

export function QuickActionsCard() {
  return (
    <section className="rounded-lg border border-[#27272A] bg-[#18181B] p-lg">
      <h2 className="text-headline-md text-zinc-100">Quick Actions</h2>
      <div className="mt-lg space-y-sm">
        {actions.map((action) => {
          const Icon = action.icon;

          return (
            <Link
              className="flex h-10 items-center gap-sm rounded-md border border-[#27272A] bg-[#121214] px-md text-body-sm text-zinc-400 transition hover:border-primary/50 hover:bg-[#27272A] hover:text-zinc-100"
              key={action.label}
              to={action.to}
            >
              <Icon className="size-4 text-secondary" />
              {action.label}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
