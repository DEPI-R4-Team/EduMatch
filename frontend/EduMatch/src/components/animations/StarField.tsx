import { useEffect, useState } from "react";

type Star = {
  id: number;
  left: number;
  top: number;
  size: number;
  delay: number;
  duration: number;
  opacity: number;
};

type StarFieldProps = {
  count?: number;
};

export function StarField({ count = 70 }: StarFieldProps) {
  const [stars, setStars] = useState<Star[]>([]);

  useEffect(() => {
    setStars(
      Array.from({ length: count }, (_, id) => ({
        id,
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: Math.random() * 2 + 1,
        delay: Math.random() * 4,
        duration: Math.random() * 3 + 3,
        opacity: Math.random() * 0.55 + 0.2,
      })),
    );
  }, [count]);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-[#030303]" aria-hidden="true">
      {stars.map((star) => (
        <span
          className="landing-star absolute rounded-full bg-white"
          key={star.id}
          style={{
            left: `${star.left}%`,
            top: `${star.top}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            opacity: star.opacity,
            animationDelay: `${star.delay}s`,
            animationDuration: `${star.duration}s`,
          }}
        />
      ))}
    </div>
  );
}
