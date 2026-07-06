import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type MarqueeProps = {
  items: ReactNode[];
  className?: string;
  itemClassName?: string;
};

export function Marquee({ items, className, itemClassName }: MarqueeProps) {
  const loopItems = [...items, ...items];

  return (
    <div className={cn("landing-marquee", className)}>
      <div className="landing-marquee-track">
        {loopItems.map((item, index) => (
          <div className={cn("landing-marquee-item", itemClassName)} key={index} aria-hidden={index >= items.length}>
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}
