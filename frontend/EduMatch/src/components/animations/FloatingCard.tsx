import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type FloatingCardProps = {
  children: ReactNode;
  className?: string;
  subtle?: boolean;
};

export function FloatingCard({ children, className, subtle = false }: FloatingCardProps) {
  return (
    <div className={cn("landing-floating-card", subtle && "landing-floating-card-subtle", className)}>
      {children}
    </div>
  );
}
