import { ShieldCheck } from "lucide-react";

export function PaymentProtectionCard() {
  return (
    <section className="rounded-lg border border-secondary/25 bg-secondary/10 p-lg">
      <div className="flex items-start gap-md">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-secondary text-on-secondary">
          <ShieldCheck className="size-5" />
        </div>
        <div>
          <h2 className="text-headline-md text-zinc-100">Payment Protection</h2>
          <p className="mt-sm text-body-sm text-zinc-400">
            Session payments stay held until the session is completed and confirmed.
          </p>
        </div>
      </div>
      <div className="mt-lg flex flex-wrap items-center gap-sm text-body-sm">
        <span className="rounded-full bg-primary/15 px-sm py-xs text-primary ring-1 ring-primary/25">Held</span>
        <span className="text-zinc-400">-&gt;</span>
        <span className="rounded-full bg-blue-400/15 px-sm py-xs text-blue-300 ring-1 ring-blue-400/25">Completed</span>
        <span className="text-zinc-400">-&gt;</span>
        <span className="rounded-full bg-emerald-400/15 px-sm py-xs text-emerald-300 ring-1 ring-emerald-400/25">Released</span>
      </div>
    </section>
  );
}
