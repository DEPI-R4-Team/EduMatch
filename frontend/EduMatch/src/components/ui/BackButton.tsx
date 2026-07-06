import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getDashboardPath, useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

type BackButtonProps = {
  fallback?: string;
  label?: string;
  className?: string;
};

export function BackButton({ fallback, label = "Back", className }: BackButtonProps) {
  const navigate = useNavigate();
  const { user } = useAuth();

  function handleClick() {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate(fallback ?? (user ? getDashboardPath(user.role) : "/"));
  }

  return (
    <button
      className={cn(
        "inline-flex h-9 items-center justify-center gap-xs rounded-xl border border-white/10 bg-transparent px-5 text-body-sm font-semibold text-white transition-colors hover:bg-white/5",
        className,
      )}
      onClick={handleClick}
      type="button"
    >
      <ArrowLeft className="size-4" />
      {label}
    </button>
  );
}
