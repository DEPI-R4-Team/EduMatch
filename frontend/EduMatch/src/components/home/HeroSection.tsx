import { Link } from "react-router-dom";
import { ArrowRight, GraduationCap, Sparkles, Zap } from "lucide-react";
import { Reveal } from "@/components/animations/Reveal";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { FloatingPreviews } from "./FloatingPreviews";
import { ROUTES } from "@/lib/routes";

const PRODUCT_CHIPS = ["Normal requests", "Group learning", "Instant help"] as const;

export function HeroSection() {
  return (
    <section className="relative mx-auto flex min-h-[88vh] max-w-[1440px] items-center justify-center overflow-hidden px-margin-mobile pb-20 pt-14 md:px-margin-desktop">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.2),transparent_34%),linear-gradient(180deg,#030303,#050505_58%,#030303)]" aria-hidden="true" />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:72px_72px] opacity-30 [mask-image:radial-gradient(circle_at_center,black,transparent_78%)]" aria-hidden="true" />
      <div className="pointer-events-none absolute left-1/2 top-[38%] -z-10 h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#8b5cf6]/20 blur-[130px]" aria-hidden="true" />

      <div className="relative z-10 flex w-full flex-col items-center gap-12">
        <div className="mx-auto max-w-[62rem] space-y-8 pt-12 text-center lg:pt-0">
          <Reveal delay={40} className="inline-flex">
            <span className="landing-eyebrow mx-auto">
              <Zap className="h-3.5 w-3.5" aria-hidden="true" />
              Instant and scheduled learning sessions
            </span>
          </Reveal>

          <Reveal delay={120}>
            <h1 className="landing-heading mx-auto max-w-[58rem] text-[clamp(2.75rem,7vw,5.8rem)] font-black leading-[0.95] text-white">
              Get the right instructor{" "}
              <span className="bg-gradient-to-r from-[#8b5cf6] via-[#a78bfa] to-white bg-clip-text text-transparent">
                exactly when you need one.
              </span>
            </h1>
          </Reveal>

          <Reveal delay={220}>
            <p className="mx-auto max-w-[43rem] text-body-lg text-gray-400">
              Post detailed academic requests for scheduled sessions, or request instant help and connect with a verified instructor. EduMatch keeps requests, sessions, chat, and simulated payments organized.
            </p>
          </Reveal>

          <Reveal delay={320}>
            <div className="flex flex-col items-center justify-center gap-4 pt-2 sm:flex-row">
              <Link
                to={ROUTES.REGISTER}
                className={cn(
                  buttonVariants({ variant: "default" }),
                  "landing-button h-auto w-full gap-2 rounded-xl bg-[#8b5cf6] px-8 py-4 text-label-md font-bold text-white shadow-[0_0_20px_rgba(139,92,246,0.2)] hover:bg-[#7c3aed] sm:w-auto",
                )}
              >
                Create a Request
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover/button:translate-x-1" aria-hidden="true" />
              </Link>
              <Link
                to={ROUTES.REGISTER}
                className="landing-button inline-flex h-auto w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-transparent px-8 py-4 text-label-md font-bold text-white backdrop-blur transition-colors hover:bg-white/5 sm:w-auto"
              >
                <GraduationCap className="h-4 w-4" aria-hidden="true" />
                Join as Instructor
              </Link>
            </div>
          </Reveal>

          <Reveal delay={420}>
            <div className="mx-auto grid max-w-[38rem] gap-3 pt-2 text-left sm:grid-cols-3">
              {PRODUCT_CHIPS.map((item) => (
                <div key={item} className="rounded-2xl border border-white/5 bg-[#0a0a0a]/80 px-4 py-3 text-body-sm font-semibold text-gray-400 backdrop-blur-xl">
                  <Sparkles className="mb-2 h-4 w-4 text-[#8b5cf6]" aria-hidden="true" />
                  {item}
                </div>
              ))}
            </div>
          </Reveal>
        </div>

        <Reveal delay={260} variant="scale-in">
          <FloatingPreviews />
        </Reveal>
      </div>
    </section>
  );
}
