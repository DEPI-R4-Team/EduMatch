import type { ReactNode } from "react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  title: string;
  message: string;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ title, message, action, className }: EmptyStateProps) {
  return (
    <section
      className={cn(
        "flex w-full min-w-0 justify-center rounded-2xl border border-dashed border-white/10 bg-[#0a0a0a] p-xl text-center shadow-lg",
        className,
      )}
    >
      <div className="mx-auto flex w-full max-w-[32rem] min-w-0 flex-col items-center">
        <div className="mx-auto mb-md flex size-14 items-center justify-center rounded-full border border-[#8b5cf6]/20 bg-[#8b5cf6]/10 text-[#8b5cf6]">
          <Inbox className="size-6" />
        </div>
        <h2 className="w-full whitespace-normal break-normal text-center text-headline-md text-white [overflow-wrap:normal] [word-break:normal]">
          {title}
        </h2>
        <p className="mx-auto mt-sm w-full max-w-[28rem] whitespace-normal break-normal text-center text-body-sm leading-relaxed text-gray-400 [overflow-wrap:normal] [word-break:normal]">
          {message}
        </p>
        {action ? <div className="mt-lg flex w-full justify-center">{action}</div> : null}
      </div>
    </section>
  );
}
