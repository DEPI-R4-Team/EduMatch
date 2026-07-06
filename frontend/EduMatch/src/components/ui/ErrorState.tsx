import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type ErrorStateProps = {
  message: string;
  className?: string;
};

export function ErrorState({ message, className }: ErrorStateProps) {
  return (
    <div className={cn("w-full min-w-0 rounded-2xl border border-red-500/20 bg-red-500/10 px-md py-sm text-body-sm text-red-400", className)}>
      <span className="flex min-w-0 items-center gap-sm whitespace-normal break-normal">
        <AlertCircle className="size-4 shrink-0" />
        <span className="min-w-0 flex-1 whitespace-normal break-normal">{message}</span>
      </span>
    </div>
  );
}
