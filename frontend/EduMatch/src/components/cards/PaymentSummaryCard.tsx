import type { LucideIcon } from "lucide-react";

type PaymentSummaryCardProps = {
  title: string;
  value: string;
  description: string;
  icon: LucideIcon;
};

export function PaymentSummaryCard({
  title,
  value,
  description,
  icon: Icon,
}: PaymentSummaryCardProps) {
  return (
    <section className="rounded-lg border border-[#27272A] bg-[#18181B] p-lg">
      <div className="flex items-start justify-between gap-md">
        <div>
          <p className="text-body-sm text-zinc-400">{title}</p>
          <p className="mt-xs text-headline-lg text-zinc-100">{value}</p>
          <p className="mt-xs text-body-sm text-zinc-400">{description}</p>
        </div>
        <div className="flex size-11 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
          <Icon className="size-5" />
        </div>
      </div>
    </section>
  );
}
