import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type LoadingStateProps = {
  message?: string;
  className?: string;
};

export function LoadingState({ message = "Loading...", className }: LoadingStateProps) {
  return (
    <div
      className={cn(
        "w-full min-w-0 rounded-2xl border border-white/5 bg-[#0a0a0a] p-md text-body-sm text-gray-400 shadow-lg",
        className,
      )}
    >
      <span className="flex min-w-0 items-center gap-sm whitespace-normal break-normal">
        <Loader2 className="size-4 shrink-0 animate-spin text-[#8b5cf6]" />
        <span className="min-w-0 flex-1 whitespace-normal break-normal">{message}</span>
      </span>
    </div>
  );
}
