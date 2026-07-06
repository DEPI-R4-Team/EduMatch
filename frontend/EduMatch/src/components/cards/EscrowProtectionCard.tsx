import { ShieldCheck } from "lucide-react";

export function EscrowProtectionCard() {
  return (
    <section className="rounded-lg border border-secondary/40 bg-secondary/10 p-lg shadow-[0_0_28px_rgba(76,215,246,0.08)]">
      <div className="flex items-start gap-md">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-md bg-secondary text-on-secondary">
          <ShieldCheck className="size-5" />
        </div>
        <div>
          <h2 className="text-headline-md text-zinc-100">Secure Escrow Protection</h2>
          <p className="mt-sm text-body-sm text-zinc-400">
            Your payment will be held securely by the platform until the session is completed and
            verified.
          </p>
        </div>
      </div>
    </section>
  );
}
