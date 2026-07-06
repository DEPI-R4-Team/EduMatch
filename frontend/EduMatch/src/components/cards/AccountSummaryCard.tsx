const summary = [
  { label: "Account Type", value: "Student" },
  { label: "Status", value: "Active" },
  { label: "Total Requests", value: "6" },
  { label: "Completed Sessions", value: "3" },
  { label: "Held Payments", value: "2" },
  { label: "Reviews Given", value: "3" },
];

export function AccountSummaryCard() {
  return (
    <section className="rounded-lg border border-[#27272A] bg-[#18181B] p-lg">
      <h2 className="text-headline-md text-zinc-100">Account Summary</h2>
      <dl className="mt-lg space-y-sm">
        {summary.map((item) => (
          <div className="flex justify-between gap-md text-body-sm" key={item.label}>
            <dt className="text-zinc-400">{item.label}</dt>
            <dd className="font-medium text-zinc-100">{item.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
