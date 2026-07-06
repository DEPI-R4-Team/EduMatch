import { useEffect, useState } from "react";
import { GraduationCap } from "lucide-react";

type Star = {
  top: number;
  left: number;
  size: number;
  opacity: number;
  animationDelay: number;
};

export function LoadingPage() {
  const [stars, setStars] = useState<Star[]>([]);

  useEffect(() => {
    setStars(
      Array.from({ length: 70 }, () => ({
        top: Math.random() * 100,
        left: Math.random() * 100,
        size: Math.random() * 2 + 1,
        opacity: Math.random() * 0.6 + 0.2,
        animationDelay: Math.random() * 4,
      })),
    );
  }, []);

  return (
    <div className="min-h-screen bg-[#030303] flex items-center justify-center relative overflow-hidden font-sans text-white">
      <div className="fixed inset-0 z-0 pointer-events-none">
        {stars.map((star, index) => (
          <span
            className="absolute rounded-full bg-white animate-pulse"
            key={`${star.top}-${star.left}-${index}`}
            style={{
              top: `${star.top}%`,
              left: `${star.left}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              opacity: star.opacity,
              animationDelay: `${star.animationDelay}s`,
            }}
          />
        ))}
      </div>

      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#8b5cf6]/20 blur-[130px] rounded-full pointer-events-none z-0" />

      <div className="relative z-10 flex flex-col items-center">
        <div className="relative w-28 h-28" role="status" aria-label="Loading">
          <div
            className="absolute inset-0 rounded-full border-2 border-white/5 border-t-[#8b5cf6] animate-spin"
            style={{ animationDuration: "1.5s" }}
          />
          <div
            className="absolute inset-2 rounded-full border-2 border-white/5 border-b-[#8b5cf6] animate-spin"
            style={{ animationDuration: "2.5s", animationDirection: "reverse" }}
          />
          <div className="absolute inset-0 m-auto bg-[#0a0a0a] border border-white/10 rounded-full w-16 h-16 flex items-center justify-center shadow-[0_0_25px_rgba(139,92,246,0.3)] backdrop-blur-xl z-10">
            <GraduationCap className="w-8 h-8 text-[#8b5cf6] animate-pulse" aria-hidden="true" />
          </div>
        </div>

        <h1 className="mt-8 text-2xl font-bold tracking-tight">EDUMATCH</h1>
        <div className="mt-4 flex items-center gap-2 px-4 py-1.5 bg-[#8b5cf6]/10 border border-[#8b5cf6]/20 rounded-full">
          <span className="w-2 h-2 rounded-full bg-[#8b5cf6] animate-ping" />
          <span className="text-[#8b5cf6] text-xs font-medium uppercase tracking-wide">
            Preparing Workspace
          </span>
        </div>
      </div>
    </div>
  );
}

export const LoadingScreen = LoadingPage;
