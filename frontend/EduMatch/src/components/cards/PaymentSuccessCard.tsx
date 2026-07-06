import { Link } from "react-router-dom";
import { CheckCircle2, MessageSquareText, CalendarClock } from "lucide-react";

type PaymentSuccessCardProps = {
  sessionPath?: string;
};

export function PaymentSuccessCard({ sessionPath = "/student/sessions/1" }: PaymentSuccessCardProps) {
  return (
    <section className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-lg">
      <div className="flex flex-col gap-md sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-md">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-md bg-emerald-400 text-[#052e1a]">
            <CheckCircle2 className="size-5" />
          </div>
          <div>
            <h2 className="text-headline-md text-zinc-100">Payment Successful</h2>
            <p className="mt-sm max-w-2xl text-body-sm text-zinc-400">
              Your payment is now held safely by the platform until the session is completed.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-sm">
          <Link
            className="inline-flex h-10 items-center justify-center gap-xs rounded-md bg-primary px-md text-body-sm font-medium text-on-primary transition hover:bg-primary/90"
            to="/student/chat"
          >
            <MessageSquareText className="size-4" />
            Open Chat
          </Link>
          <Link
            className="inline-flex h-10 items-center justify-center gap-xs rounded-md border border-secondary/40 px-md text-body-sm font-medium text-secondary transition hover:bg-secondary/10"
            to={sessionPath}
          >
            <CalendarClock className="size-4" />
            View Session
          </Link>
        </div>
      </div>
    </section>
  );
}
