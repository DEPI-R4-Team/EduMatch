import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { getAdminPayments, refundPayment, releasePayment } from "@/services/admin.service";
import type { AdminPayment } from "@/types/admin";

function money(value: string) {
  return `${Number(value).toFixed(2)} EGP`;
}

export function AdminPaymentsPage() {
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [actionId, setActionId] = useState<string | null>(null);

  async function loadPayments() {
    setLoading(true);
    try {
      setPayments(await getAdminPayments({ status: status || undefined }));
      setError("");
    } catch {
      setError("Could not load payments. Admin access is required.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function runPaymentAction(key: string, successText: string, action: () => Promise<unknown>) {
    setActionId(key);
    setMessage("");
    setError("");
    try {
      await action();
      setMessage(successText);
      await loadPayments();
    } catch (caughtError) {
      setError((caughtError as { response?: { data?: { detail?: string } } }).response?.data?.detail ?? "Payment action failed.");
    } finally {
      setActionId(null);
    }
  }

  return (
    <Page title="Payments" description="Manage held simulated payments." error={error} message={message} loading={loading} empty={!payments.length}>
      <select className="h-10 w-fit rounded-md border border-[#27272A] bg-[#18181B] px-md text-body-sm text-zinc-100" value={status} onChange={(e) => setStatus(e.target.value)}>
        {["", "pending", "held", "released", "refunded", "cancelled", "disputed"].map((item) => <option key={item} value={item}>{item || "All statuses"}</option>)}
      </select>
      <section className="overflow-hidden rounded-lg border border-[#27272A] bg-[#18181B]">
        <Header headers={["ID", "Student", "Instructor", "Amount", "Fee", "Total", "Status", "Actions"]} />
        {payments.map((payment) => (
          <div className="grid gap-md border-b border-[#27272A] px-lg py-md last:border-b-0 md:grid-cols-[80px_minmax(0,1fr)_minmax(0,1fr)_110px_100px_110px_110px_120px]" key={payment.id}>
            <span className="text-body-sm text-zinc-400">#{payment.id}</span>
            <span className="text-body-sm text-zinc-400">{payment.student_name ?? "Student"}</span>
            <span className="text-body-sm text-zinc-400">{payment.instructor_name ?? "Instructor"}</span>
            <span className="text-body-sm text-zinc-400">{money(payment.amount)}</span>
            <span className="text-body-sm text-zinc-400">{money(payment.platform_fee)}</span>
            <span className="text-body-sm font-medium text-zinc-100">{money(payment.total_amount)}</span>
            <span className="text-body-sm capitalize text-zinc-400">{payment.status}</span>
            <span className="flex flex-wrap gap-xs">
              {payment.status === "held" ? (
                <>
                  <button className="inline-flex h-8 items-center rounded-md bg-emerald-400/15 px-sm text-label-md text-emerald-300 ring-1 ring-emerald-400/25 disabled:opacity-50" disabled={actionId !== null} onClick={() => { if (window.confirm("This will release held payment to the instructor wallet. Continue?")) void runPaymentAction(`release-${payment.id}`, "Payment released.", () => releasePayment(payment.id)); }} type="button">
                    Release
                  </button>
                  <button className="inline-flex h-8 items-center rounded-md bg-error/10 px-sm text-label-md text-error ring-1 ring-error/25 disabled:opacity-50" disabled={actionId !== null} onClick={() => { if (window.confirm("This will refund the held payment and remove it from instructor pending balance. Continue?")) void runPaymentAction(`refund-${payment.id}`, "Payment refunded.", () => refundPayment(payment.id)); }} type="button">
                    Refund
                  </button>
                </>
              ) : (
                <span className="text-body-sm capitalize text-zinc-400">{payment.status}</span>
              )}
            </span>
          </div>
        ))}
      </section>
    </Page>
  );
}

function Page({ title, description, error, message, loading, empty, children }: { title: string; description: string; error: string; message: string; loading: boolean; empty: boolean; children: ReactNode }) {
  return <><header className="sticky top-0 z-[60] bg-[#09090B]/95 backdrop-blur-xl border-b border-[#27272A] px-margin-mobile py-lg md:px-margin-desktop"><h1 className="text-headline-lg text-zinc-100">{title}</h1><p className="mt-xs text-body-sm text-zinc-400">{description}</p></header><div className="space-y-lg px-margin-mobile py-lg md:px-margin-desktop">{message ? <p className="rounded-md border border-secondary/25 bg-secondary/10 px-md py-sm text-body-sm text-secondary">{message}</p> : null}{error ? <ErrorState message={error} /> : null}{loading ? <LoadingState message={`Loading ${title.toLowerCase()}...`} /> : null}{children}{!loading && empty ? <EmptyState title={`No ${title.toLowerCase()} found`} message="Real platform data will appear here when available." /> : null}</div></>;
}

function Header({ headers }: { headers: string[] }) {
  return <div className="hidden gap-md border-b border-[#27272A] bg-[#121214] px-lg py-sm md:grid md:grid-cols-[80px_minmax(0,1fr)_minmax(0,1fr)_110px_100px_110px_110px_120px]">{headers.map((h) => <span className="text-label-md uppercase text-zinc-400" key={h}>{h}</span>)}</div>;
}
