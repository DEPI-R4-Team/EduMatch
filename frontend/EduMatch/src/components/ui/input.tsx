import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-10 w-full min-w-0 rounded-xl border border-white/10 bg-[#111] px-4 py-2.5",
        "text-base text-white shadow-xs transition-all outline-none",
        "placeholder:text-gray-500",
        "focus-visible:border-[#8b5cf6] focus-visible:ring-1 focus-visible:ring-[#8b5cf6]",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
        "md:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
