import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

type RevealVariant = "fade-up" | "fade-left" | "fade-right" | "scale-in";

type RevealProps = {
  as?: "div" | "section" | "article" | "header" | "footer";
  children: ReactNode;
  className?: string;
  delay?: number;
  variant?: RevealVariant;
};

export function Reveal({
  as: Component = "div",
  children,
  className,
  delay = 0,
  variant = "fade-up",
}: RevealProps) {
  return (
    <Component
      className={cn("landing-reveal", `landing-reveal-${variant}`, className)}
      style={{ "--reveal-delay": `${delay}ms` } as CSSProperties}
    >
      {children}
    </Component>
  );
}
