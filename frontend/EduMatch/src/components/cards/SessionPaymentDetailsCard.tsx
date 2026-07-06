type SessionPaymentDetails = {
  instructorName: string;
  instructorRole: string;
  subject: string;
  duration: string;
  dateTime: string;
  sessionType: string;
  sessionMode: string;
};

type SessionPaymentDetailsCardProps = {
  details: SessionPaymentDetails;
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);
}

export function SessionPaymentDetailsCard({ details }: SessionPaymentDetailsCardProps) {
  const sessionRows = [
    { label: "Subject", value: details.subject },
    { label: "Duration", value: details.duration },
    { label: "Date & Time", value: details.dateTime },
    { label: "Session Type", value: details.sessionType },
    { label: "Session Mode", value: details.sessionMode },
  ];

  return (
    <section className="rounded-lg border border-[#27272A] bg-[#18181B] p-lg">
      <div className="flex items-center gap-md">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary text-body-md font-semibold text-on-primary">
          {getInitials(details.instructorName)}
        </div>
        <div>
          <h2 className="text-headline-md text-zinc-100">{details.instructorName}</h2>
          <p className="text-body-sm text-zinc-400">{details.instructorRole}</p>
        </div>
      </div>

      <div className="my-lg border-t border-[#27272A]" />

      <dl className="space-y-md">
        {sessionRows.map((row) => (
          <div className="flex items-center justify-between gap-md" key={row.label}>
            <dt className="text-body-sm text-zinc-400">{row.label}</dt>
            <dd className="text-right text-body-sm font-medium text-zinc-100">{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
