import { Link } from "react-router-dom";
import { PaymentStatusBadge, type PaymentStatus } from "@/components/ui/PaymentStatusBadge";

export type PaymentHistoryRow = {
  id: string;
  sessionId?: string;
  session: string;
  instructor: string;
  amount: string;
  platformFee: string;
  total: string;
  status: PaymentStatus;
  date: string;
  action: "Pay Now" | "View Session" | "View Receipt" | "View Details";
};

type PaymentHistoryTableProps = {
  onViewReceipt: (row: PaymentHistoryRow) => void;
  rows: PaymentHistoryRow[];
};

export function PaymentHistoryTable({ onViewReceipt, rows }: PaymentHistoryTableProps) {
  return (
    <section className="bg-[#18181B] border border-[#27272A] rounded-2xl overflow-hidden">
      <h2 className="px-6 pt-6 text-headline-md text-zinc-100">Payment History</h2>

      <div className="mt-lg overflow-x-auto">
        <table className="w-full min-w-[840px] text-left text-body-sm">
          <thead className="bg-[#121214] border-b border-[#27272A] text-zinc-400 text-xs uppercase tracking-wider font-semibold">
            <tr>
              <th className="py-4 px-6">Session</th>
              <th className="py-4 px-6">Instructor</th>
              <th className="py-4 px-6">Amount</th>
              <th className="py-4 px-6">Platform Fee</th>
              <th className="py-4 px-6">Total</th>
              <th className="py-4 px-6">Status</th>
              <th className="py-4 px-6">Date</th>
              <th className="py-4 px-6">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr className="border-b border-[#27272A] hover:bg-[#121214]/50 transition-colors last:border-b-0" key={row.id}>
                <td className="py-4 px-6 text-sm font-medium text-zinc-100">{row.session}</td>
                <td className="py-4 px-6 text-sm text-zinc-300">{row.instructor}</td>
                <td className="py-4 px-6 text-sm text-zinc-300">{row.amount}</td>
                <td className="py-4 px-6 text-sm text-zinc-300">{row.platformFee}</td>
                <td className="py-4 px-6 text-sm text-zinc-100">{row.total}</td>
                <td className="py-4 px-6 text-sm text-zinc-300">
                  <PaymentStatusBadge status={row.status} />
                </td>
                <td className="py-4 px-6 text-sm text-zinc-300">{row.date}</td>
                <td className="py-4 px-6 text-sm text-zinc-300">
                  {row.action === "Pay Now" ? (
                    <Link
                      className="inline-flex h-9 items-center justify-center rounded-xl bg-[#8b5cf6] px-5 text-body-sm font-semibold text-zinc-100 shadow-[0_0_20px_rgba(139,92,246,0.2)] transition-all hover:bg-[#7c3aed] disabled:cursor-not-allowed disabled:opacity-60"
                      to={row.sessionId ? `/student/payments/session/${row.sessionId}` : "/student/payments"}
                    >
                      Pay Now
                    </Link>
                  ) : row.action === "View Session" ? (
                    <Link
                      className="inline-flex h-9 items-center justify-center rounded-xl border border-[#27272A] bg-transparent px-5 text-body-sm font-semibold text-zinc-100 transition-colors hover:bg-white/5"
                      to={row.sessionId ? `/student/sessions/${row.sessionId}` : "/student/sessions"}
                    >
                      View Session
                    </Link>
                  ) : (
                    <button
                      className="inline-flex h-9 items-center justify-center rounded-xl border border-[#27272A] bg-transparent px-5 text-body-sm font-semibold text-zinc-100 transition-colors hover:bg-white/5"
                      onClick={() => onViewReceipt(row)}
                      type="button"
                    >
                      {row.action}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
