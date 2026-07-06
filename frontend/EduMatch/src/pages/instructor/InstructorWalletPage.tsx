import { useEffect, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CircleDollarSign,
  Clock3,
  Wallet,
} from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { cn } from "@/lib/utils";
import { getInstructorWallet, getWalletTransactions } from "@/services/wallet.service";
import type { InstructorWallet, WalletTransaction } from "@/types/wallet";

function formatMoney(value: string | null | undefined) {
  return `${Number.parseFloat(value ?? "0").toFixed(2)} EGP`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value));
}

const typeClasses: Record<string, string> = {
  release: "text-emerald-300",
  withdraw: "text-error",
  refund: "text-error",
  hold: "text-tertiary",
};

export function InstructorWalletPage() {
  const [wallet, setWallet] = useState<InstructorWallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadWallet() {
      try {
        const [walletData, transactionData] = await Promise.all([
          getInstructorWallet(),
          getWalletTransactions(),
        ]);
        setWallet(walletData);
        setTransactions(transactionData);
        setError("");
      } catch {
        setError("Could not load wallet. Make sure the backend is running.");
      } finally {
        setLoading(false);
      }
    }

    void loadWallet();
  }, []);

  const walletStats = [
    {
      label: "Pending Balance",
      value: formatMoney(wallet?.pending_balance),
      helper: "Held until session completion",
      icon: Clock3,
      tone: "bg-tertiary/15 text-tertiary ring-tertiary/20",
    },
    {
      label: "Available Balance",
      value: formatMoney(wallet?.available_balance),
      helper: "Released simulated earnings",
      icon: Wallet,
      tone: "bg-emerald-400/15 text-emerald-300 ring-emerald-400/20",
    },
    {
      label: "Total Earned",
      value: formatMoney(wallet?.total_earned),
      helper: "All time",
      icon: CircleDollarSign,
      tone: "bg-primary/15 text-primary ring-primary/20",
    },
  ];

  return (
    <>
      <header className="sticky top-0 z-[60] bg-[#09090B]/95 backdrop-blur-xl border-b border-[#27272A] px-margin-mobile py-lg md:px-margin-desktop">
        <h1 className="text-headline-lg text-zinc-100">Wallet</h1>
        <p className="mt-xs max-w-2xl text-body-sm text-zinc-400">
          Track your earnings, pending payments, and simulated wallet transactions.
        </p>
      </header>

      <div className="space-y-lg px-margin-mobile py-lg md:px-margin-desktop">
        {notice ? <p className="rounded-md border border-secondary/25 bg-secondary/10 px-md py-sm text-body-sm text-secondary">{notice}</p> : null}
        {error ? <ErrorState message={error} /> : null}
        {loading ? <LoadingState message="Loading wallet..." /> : null}

        <section className="grid gap-md sm:grid-cols-3">
          {walletStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <article className="rounded-lg border border-[#27272A] bg-[#18181B] p-lg" key={stat.label}>
                <div className="mb-lg flex items-center justify-between gap-md">
                  <p className="text-label-md uppercase text-zinc-400">{stat.label}</p>
                  <div className={cn("rounded-md p-sm ring-1", stat.tone)}>
                    <Icon className="size-5" />
                  </div>
                </div>
                <p className="text-headline-lg text-zinc-100">{stat.value}</p>
                <p className="mt-xs text-body-sm text-zinc-400">{stat.helper}</p>
              </article>
            );
          })}
        </section>

        <div className="flex flex-wrap gap-sm">
          <button
            className="inline-flex h-10 items-center justify-center gap-xs rounded-md bg-primary px-md text-body-sm font-medium text-on-primary transition hover:bg-primary/90"
            onClick={() => setNotice("Withdrawals are not connected yet. Released balances remain in the simulated wallet.")}
            type="button"
          >
            <ArrowUpFromLine className="size-4" />
            Withdraw to Bank
          </button>
        </div>

        <section className="rounded-lg border border-[#27272A] bg-[#18181B] p-lg">
          <h2 className="text-headline-md text-zinc-100">Transaction History</h2>
          <div className="mt-lg overflow-hidden rounded-md border border-[#27272A]">
            <div className="hidden grid-cols-[minmax(0,2fr)_minmax(0,1fr)_100px_120px] gap-md border-b border-[#27272A] bg-[#121214] px-lg py-sm md:grid">
              <span className="text-label-md uppercase text-zinc-400">Description</span>
              <span className="text-label-md uppercase text-zinc-400">Status</span>
              <span className="text-label-md uppercase text-zinc-400 text-right">Amount</span>
              <span className="text-label-md uppercase text-zinc-400 text-right">Date</span>
            </div>
            {transactions.length > 0 ? (
              transactions.map((tx, index) => (
                <div
                  className={cn(
                    "grid gap-y-xs gap-x-md px-lg py-md md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_100px_120px] md:items-center",
                    index !== transactions.length - 1 && "border-b border-[#27272A]",
                  )}
                  key={tx.id}
                >
                  <div className="flex items-center gap-sm">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-[#27272A] text-zinc-400">
                      {tx.type === "withdraw" || tx.type === "refund" ? <ArrowUpFromLine className="size-4" /> : <ArrowDownToLine className="size-4" />}
                    </div>
                    <p className="truncate text-body-sm capitalize text-zinc-100">{tx.type} transaction</p>
                  </div>
                  <p className="text-body-sm capitalize text-zinc-400">{tx.status}</p>
                  <p className={cn("text-body-sm font-medium md:text-right", typeClasses[tx.type] ?? "text-zinc-100")}>
                    {formatMoney(tx.amount)}
                  </p>
                  <p className="text-body-sm text-zinc-400 md:text-right">{formatDate(tx.created_at)}</p>
                </div>
              ))
            ) : (
              <div className="p-lg">
                <EmptyState message="No wallet transactions yet." title="No wallet transactions yet" />
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
