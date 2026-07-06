import { useEffect, useState } from "react";
import { AxiosError } from "axios";
import { BadgeDollarSign, ClipboardList, MessageSquareQuote, ShieldCheck, Users, Video, WalletCards } from "lucide-react";
import { DashboardTopbarActions } from "@/components/layout/DashboardTopbarActions";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { getAdminPayments, getAdminRequests, getAdminStats, getAdminUsers } from "@/services/admin.service";
import type { AdminPayment, AdminRequest, AdminStats, AdminUser } from "@/types/admin";

function money(value: string | number | null | undefined) {
  return `${Number(value ?? 0).toFixed(2)} EGP`;
}

function date(value: string | null | undefined) {
  return value ? new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value)) : "Not set";
}

export function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [requests, setRequests] = useState<AdminRequest[]>([]);
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [statsData, userData, requestData, paymentData] = await Promise.all([
          getAdminStats(),
          getAdminUsers({ limit: 5 }),
          getAdminRequests({ limit: 5 }),
          getAdminPayments({ limit: 5 }),
        ]);
        setStats(statsData);
        setUsers(userData);
        setRequests(requestData);
        setPayments(paymentData);
        setError("");
      } catch (err) {
        if (err instanceof AxiosError && err.response?.status === 403) {
          setError("Admin access is required. Please log in with an admin account.");
        } else if (err instanceof AxiosError && err.response?.status === 401) {
          setError("Your session expired. Please log in again.");
        } else {
          setError("Could not load admin dashboard.");
        }
      } finally {
        setLoading(false);
      }
    }
    void loadDashboard();
  }, []);

  const cards = stats
    ? [
        { label: "Total users", value: stats.total_users, icon: Users },
        { label: "Students", value: stats.total_students, icon: Users },
        { label: "Instructors", value: stats.total_instructors, icon: ShieldCheck },
        { label: "Requests", value: stats.total_requests, icon: ClipboardList },
        { label: "Active sessions", value: stats.active_sessions, icon: Video },
        { label: "Held payments", value: stats.held_payments, icon: WalletCards },
        { label: "Released payments", value: stats.released_payments, icon: BadgeDollarSign },
        { label: "Reviews", value: stats.total_reviews, icon: MessageSquareQuote },
      ]
    : [];

  return (
    <>
      <header className="sticky top-0 z-[60] bg-[#09090B]/95 backdrop-blur-xl border-b border-[#27272A] px-6 py-4">
        <div className="flex flex-col gap-lg lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-label-md uppercase text-[#8b5cf6]">Admin Dashboard</p>
            <h1 className="mt-xs text-headline-lg text-zinc-100">Platform overview</h1>
            <p className="mt-xs max-w-2xl text-body-sm text-zinc-400">Read-only overview of real platform activity.</p>
          </div>

          <DashboardTopbarActions />
        </div>
      </header>
      <div className="space-y-lg px-margin-mobile py-lg md:px-margin-desktop">
        {error ? <ErrorState message={error} /> : null}
        {loading ? <LoadingState message="Loading admin dashboard..." /> : null}
        {stats ? (
          <>
            <section className="grid gap-md sm:grid-cols-2 xl:grid-cols-4">
              {cards.map((card) => {
                const Icon = card.icon;
                return (
                  <article className="relative overflow-hidden rounded-2xl border border-[#27272A] bg-[#18181B] p-6 shadow-lg" key={card.label}>
                    <div className="mb-lg flex items-center justify-between">
                      <p className="text-label-md uppercase text-zinc-400">{card.label}</p>
                      <div className="w-10 h-10 rounded-xl bg-[#09090B] border border-[#27272A] flex items-center justify-center text-[#8b5cf6]"><Icon className="size-5" /></div>
                    </div>
                    <p className="text-2xl font-bold text-zinc-100">{card.value}</p>
                  </article>
                );
              })}
            </section>
            <section className="grid gap-md lg:grid-cols-3">
              <article className="relative overflow-hidden rounded-2xl border border-[#27272A] bg-[#18181B] p-6 shadow-lg">
                <p className="text-label-md uppercase text-zinc-400">Wallet pending</p>
                <p className="mt-xs text-2xl font-bold text-zinc-100">{money(stats.total_wallet_pending_balance)}</p>
              </article>
              <article className="relative overflow-hidden rounded-2xl border border-[#27272A] bg-[#18181B] p-6 shadow-lg">
                <p className="text-label-md uppercase text-zinc-400">Wallet available</p>
                <p className="mt-xs text-2xl font-bold text-zinc-100">{money(stats.total_wallet_available_balance)}</p>
              </article>
              <article className="relative overflow-hidden rounded-2xl border border-[#27272A] bg-[#18181B] p-6 shadow-lg">
                <p className="text-label-md uppercase text-zinc-400">Platform revenue</p>
                <p className="mt-xs text-2xl font-bold text-zinc-100">{money(stats.total_platform_revenue)}</p>
              </article>
            </section>
            <section className="grid gap-lg xl:grid-cols-3">
              <Recent title="Recent users" rows={users.map((user) => `${user.full_name} - ${user.role} - ${date(user.created_at)}`)} />
              <Recent title="Recent requests" rows={requests.map((request) => `${request.title} - ${request.status} - ${date(request.created_at)}`)} />
              <Recent title="Recent payments" rows={payments.map((payment) => `#${payment.id} - ${payment.status} - ${money(payment.total_amount)}`)} />
            </section>
          </>
        ) : !loading ? (
          <EmptyState title="No admin data" message="Platform data will appear after users start using EduMatch." />
        ) : null}
      </div>
    </>
  );
}

function Recent({ title, rows }: { title: string; rows: string[] }) {
  return (
    <article className="relative overflow-hidden rounded-2xl border border-[#27272A] bg-[#18181B] p-6 shadow-lg">
      <h2 className="text-headline-md text-zinc-100">{title}</h2>
      <div className="mt-md space-y-sm">
        {rows.length > 0 ? rows.map((row) => <p className="rounded-xl border border-[#27272A] bg-[#09090B]/70 p-sm text-body-sm text-zinc-300 transition-all duration-300 hover:border-[#8b5cf6]/30 hover:bg-[#09090B] hover:shadow-[0_4px_20px_rgba(139,92,246,0.05)]" key={row}>{row}</p>) : <p className="text-body-sm text-zinc-400">No data yet.</p>}
      </div>
    </article>
  );
}
