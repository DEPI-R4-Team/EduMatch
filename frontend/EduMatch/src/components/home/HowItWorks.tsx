import { CheckCircle2, MessageSquareText, Send, Star, WalletCards } from "lucide-react";
import { Reveal } from "@/components/animations/Reveal";
import { ScrollReveal } from "@/components/animations/ScrollReveal";

type HowItWorksStep = {
  number: number;
  title: string;
  description: string;
  visual: "request" | "applications" | "chat" | "complete";
};

const STEPS: HowItWorksStep[] = [
  {
    number: 1,
    title: "Create your request",
    description: "Choose the topic, session mode, budget, and learning goal.",
    visual: "request",
  },
  {
    number: 2,
    title: "Connect with an instructor",
    description: "Review applications or let an available instructor accept an instant request.",
    visual: "applications",
  },
  {
    number: 3,
    title: "Learn and communicate",
    description: "Use session chat to keep questions, details, and next steps organized.",
    visual: "chat",
  },
  {
    number: 4,
    title: "Complete and review",
    description: "Confirm completion, release simulated escrow, and leave a review.",
    visual: "complete",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="landing-section px-margin-mobile md:px-margin-desktop scroll-mt-24">
      <ScrollReveal>
        <div className="mx-auto max-w-[1440px]">
          <Reveal className="mx-auto mb-16 max-w-[46rem] space-y-4 text-center">
            <span className="landing-eyebrow">How it works</span>
            <h2 className="landing-heading text-headline-lg font-black md:text-headline-xl">
              From request to review in one guided flow
            </h2>
            <p className="landing-copy text-body-lg">
              EduMatch keeps discovery, communication, payment simulation, and completion in a clear sequence.
            </p>
          </Reveal>

          <div className="relative">
            <div className="absolute left-6 right-6 top-20 hidden h-px bg-gradient-to-r from-transparent via-primary/35 to-transparent lg:block" aria-hidden="true" />
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {STEPS.map((step, index) => (
                <Reveal as="article" delay={index * 90} key={step.number} className="landing-card landing-tilt group relative overflow-hidden rounded-[var(--landing-radius-card)] border bg-[var(--landing-panel)] p-5 backdrop-blur transition-all duration-300 hover:border-primary/40">
                  <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-primary/10 to-transparent" aria-hidden="true" />
                  <div className="relative z-10">
                    <div className="mb-5 flex items-center justify-between">
                      <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-headline-md font-black text-primary">
                        {step.number}
                      </span>
                      <span className="rounded-full border border-outline-variant bg-background/40 px-3 py-1 text-label-md text-on-surface-variant">
                        Step {step.number}
                      </span>
                    </div>
                    <StepVisual type={step.visual} />
                    <div className="mt-5 space-y-2">
                      <h3 className="text-headline-md font-bold text-on-background">{step.title}</h3>
                      <p className="text-body-sm text-on-surface-variant">{step.description}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}

function StepVisual({ type }: { type: HowItWorksStep["visual"] }) {
  if (type === "request") {
    return (
      <div className="h-36 rounded-2xl border border-outline-variant bg-background/45 p-4">
        <div className="landing-dashboard-line mb-3 h-3 w-24 rounded-full bg-primary/45" />
        <div className="space-y-2">
          <div className="landing-dashboard-line h-3 rounded-full bg-surface-variant" />
          <div className="landing-dashboard-line h-3 w-4/5 rounded-full bg-surface-variant" />
          <div className="landing-dashboard-line h-8 w-full rounded-xl bg-secondary/15" />
        </div>
      </div>
    );
  }

  if (type === "applications") {
    return (
      <div className="h-36 space-y-3 rounded-2xl border border-outline-variant bg-background/45 p-4">
        {[0, 1, 2].map((item) => (
          <div key={item} className="landing-feature-preview flex items-center justify-between rounded-xl border border-outline-variant bg-surface-container px-3 py-2">
            <span className="h-7 w-7 rounded-full bg-gradient-to-br from-primary to-secondary" />
            <Send className="h-4 w-4 text-primary" />
          </div>
        ))}
      </div>
    );
  }

  if (type === "chat") {
    return (
      <div className="h-36 rounded-2xl border border-outline-variant bg-background/45 p-4">
        <MessageSquareText className="mb-3 h-5 w-5 text-secondary" />
        <div className="space-y-3">
          <div className="landing-dashboard-line h-8 w-4/5 rounded-2xl bg-primary/15" />
          <div className="landing-dashboard-line ml-auto h-8 w-3/5 rounded-2xl bg-secondary/15" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-36 rounded-2xl border border-outline-variant bg-background/45 p-4">
      <div className="mb-4 flex items-center justify-between">
        <WalletCards className="h-5 w-5 text-primary" />
        <CheckCircle2 className="h-5 w-5 text-secondary" />
      </div>
      <div className="mb-4 h-3 overflow-hidden rounded-full bg-surface-variant">
        <div className="landing-dashboard-line h-full w-4/5 rounded-full bg-gradient-to-r from-primary to-secondary" />
      </div>
      <div className="flex gap-1 text-tertiary">
        {Array.from({ length: 5 }).map((_, index) => (
          <Star key={index} className="h-4 w-4 fill-current" />
        ))}
      </div>
    </div>
  );
}
