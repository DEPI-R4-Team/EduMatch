import { useState } from "react";
import { Link } from "react-router-dom";
import {
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Code2,
  GraduationCap,
  LockKeyhole,
  MessageSquareText,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  UsersRound,
  WalletCards,
  Zap,
} from "lucide-react";
import { Marquee } from "@/components/animations/Marquee";
import { Reveal } from "@/components/animations/Reveal";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/lib/routes";
import { buttonVariants } from "@/components/ui/button";

type IconType = typeof Search;

const features: Array<{ icon: IconType; title: string; description: string; accent: string }> = [
  {
    icon: Search,
    title: "Normal Requests",
    description: "Students describe what they need, compare instructor applications, and choose the best fit.",
    accent: "text-primary",
  },
  {
    icon: UsersRound,
    title: "Group Learning",
    description: "Students join shared requests, split costs, and move into one organized group session.",
    accent: "text-secondary",
  },
  {
    icon: Zap,
    title: "Instant Help",
    description: "Urgent requests can be accepted by available instructors before the request expires.",
    accent: "text-tertiary",
  },
  {
    icon: LockKeyhole,
    title: "Secure Simulated Escrow",
    description: "Payments are held in simulation until completion is confirmed and release rules apply.",
    accent: "text-primary",
  },
  {
    icon: MessageSquareText,
    title: "Session Chat",
    description: "Database-backed messages keep session communication tied to the learning context.",
    accent: "text-secondary",
  },
  {
    icon: Star,
    title: "Reviews and Ratings",
    description: "Students review completed sessions and visible reviews shape instructor ratings.",
    accent: "text-tertiary",
  },
  {
    icon: GraduationCap,
    title: "Instructor Discovery",
    description: "Students browse real instructor profiles by specialization, skills, pricing, and reviews.",
    accent: "text-primary",
  },
  {
    icon: BadgeCheck,
    title: "Notifications",
    description: "Important application, payment, session, review, and admin events create database notifications.",
    accent: "text-secondary",
  },
];

const studentBenefits = [
  "Create normal, group, or instant requests",
  "Compare instructors by profile, price, and reviews",
  "Pay through the simulated escrow flow",
  "Track chat, sessions, completion, and reviews",
];

const instructorBenefits = [
  "Browse open learning requests",
  "Apply to requests or accept instant sessions",
  "Manage sessions and student communication",
  "Track held and released wallet balances",
];

const categories = [
  "Programming",
  "Artificial Intelligence",
  "Mathematics",
  "Electronics",
  "Web Development",
  "Databases",
  "Machine Learning",
  "Signals",
  "Control Systems",
  "Embedded Systems",
];

const trustItems = [
  {
    title: "Clear workflows",
    description: "Every role has a focused path from request to session completion.",
  },
  {
    title: "Protected admin controls",
    description: "Admins can moderate users, instructors, payments, and reviews through protected APIs.",
  },
  {
    title: "Academic MVP scope",
    description: "The platform demonstrates real marketplace logic without real payment processing.",
  },
];

const faqs = [
  {
    question: "What is EduMatch?",
    answer:
      "EduMatch is a learning platform that connects students with instructors for targeted academic help, scheduled sessions, group learning, and instant support.",
  },
  {
    question: "How do students find instructors?",
    answer:
      "Students can browse instructor profiles or create a request with the subject, goals, timing, budget, and preferred session format.",
  },
  {
    question: "Can instructors accept or decline requests?",
    answer:
      "Yes. Instructors can apply to normal and group requests, and available instructors can accept open instant requests.",
  },
  {
    question: "Are sessions online or offline?",
    answer:
      "EduMatch supports both online and offline session modes, depending on what the student requests and instructor offers.",
  },
  {
    question: "Is payment real?",
    answer:
      "No. EduMatch uses simulated escrow payments for the graduation-project MVP. No real payment gateway is integrated.",
  },
  {
    question: "Does EduMatch use real-time WebSockets?",
    answer:
      "No. Chat and notifications currently use database-backed polling to keep the MVP simple and stable.",
  },
];

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <Reveal className="mx-auto mb-12 max-w-[48rem] space-y-4 text-center">
      <span className="landing-eyebrow">{eyebrow}</span>
      <h2 className="landing-heading text-headline-lg font-black md:text-headline-xl">{title}</h2>
      <p className="landing-copy text-body-lg">{description}</p>
    </Reveal>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
  accent,
  delay = 0,
}: {
  icon: IconType;
  title: string;
  description: string;
  accent: string;
  delay?: number;
}) {
  return (
    <Reveal as="article" delay={delay} className="landing-card landing-tilt group relative overflow-hidden rounded-[var(--landing-radius-card)] border bg-[var(--landing-panel)] p-6 backdrop-blur transition-all duration-300 hover:border-primary/40">
      <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-primary/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" aria-hidden="true" />
      <div className="relative z-10">
        <div className={cn("mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-outline-variant bg-background/45 shadow-[0_12px_30px_rgba(0,0,0,0.18)]", accent)}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <h3 className="mb-2 text-headline-md font-bold text-on-background">{title}</h3>
        <p className="text-body-sm text-on-surface-variant">{description}</p>
        <div className="landing-feature-preview mt-5 h-2 overflow-hidden rounded-full bg-surface-variant">
          <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-primary to-secondary" />
        </div>
      </div>
    </Reveal>
  );
}

function BenefitsSection({
  id,
  eyebrow,
  title,
  description,
  benefits,
  flipped = false,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  benefits: string[];
  flipped?: boolean;
}) {
  return (
    <section id={id} className="landing-section relative overflow-hidden px-margin-mobile md:px-margin-desktop scroll-mt-24">
      <ScrollReveal>
        <div className="mx-auto max-w-[1440px]">
          <div className={cn("grid items-center gap-10 lg:grid-cols-2", flipped && "lg:[&>*:first-child]:order-2")}>
            <Reveal variant={flipped ? "fade-left" : "fade-right"} className="space-y-6">
              <span className="landing-eyebrow">{eyebrow}</span>
              <div className="space-y-4">
                <h2 className="landing-heading text-headline-lg font-black md:text-headline-xl">{title}</h2>
                <p className="landing-copy text-body-lg">{description}</p>
              </div>
              <ul className="grid gap-3">
                {benefits.map((benefit, index) => (
                  <li key={benefit} className="landing-card flex items-start gap-3 rounded-2xl border bg-[var(--landing-panel)] px-4 py-3 text-body-md text-on-surface-variant backdrop-blur transition-all duration-300" style={{ transitionDelay: `${index * 45}ms` }}>
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </Reveal>

            <Reveal variant={flipped ? "fade-right" : "fade-left"} className="perspective-[900px]">
              <div className="landing-product-card landing-card relative min-h-[390px] overflow-hidden rounded-[var(--landing-radius-card)] border bg-[var(--landing-panel-elevated)] p-6 shadow-[var(--landing-shadow-soft)] backdrop-blur">
                <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-primary/12 to-transparent" aria-hidden="true" />
                <div className="relative z-10 flex min-h-[335px] flex-col justify-between">
                  <div className="landing-dashboard-profile flex items-center justify-between">
                    <div className="rounded-2xl border border-outline-variant bg-background/50 p-3 text-primary">
                      {id === "students" ? <GraduationCap className="h-7 w-7" aria-hidden="true" /> : <UsersRound className="h-7 w-7" aria-hidden="true" />}
                    </div>
                    <div className="landing-live-badge rounded-full border border-secondary/30 bg-secondary/10 px-3 py-1 text-label-md font-bold text-secondary">
                      {id === "students" ? "Request active" : "Availability on"}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-2xl border border-outline-variant bg-background/60 p-4">
                      <div className="mb-4 flex items-center gap-3">
                        <div className="landing-dashboard-avatar h-10 w-10 rounded-full bg-gradient-to-br from-primary to-secondary" />
                        <div className="min-w-0 flex-1">
                          <div className="landing-dashboard-line h-3 w-36 rounded-full bg-on-surface-variant/40" />
                          <div className="landing-dashboard-line mt-2 h-2 w-24 rounded-full bg-on-surface-variant/20" />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="landing-dashboard-stat h-16 rounded-xl bg-primary/15" />
                        <div className="landing-dashboard-stat h-16 rounded-xl bg-secondary/15" />
                        <div className="landing-dashboard-stat h-16 rounded-xl bg-tertiary/15" />
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="landing-feature-preview rounded-2xl border border-outline-variant bg-surface-container p-4">
                        <CalendarClock className="mb-3 h-5 w-5 text-secondary" aria-hidden="true" />
                        <p className="text-body-sm font-bold text-on-background">Session ready</p>
                      </div>
                      <div className="landing-feature-preview rounded-2xl border border-outline-variant bg-surface-container p-4">
                        <WalletCards className="mb-3 h-5 w-5 text-primary" aria-hidden="true" />
                        <p className="text-body-sm font-bold text-on-background">{id === "students" ? "Payment held" : "Wallet updated"}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}

export function FeaturesSection() {
  return (
    <section id="features" className="landing-section relative overflow-hidden px-margin-mobile md:px-margin-desktop scroll-mt-24">
      <div className="landing-ambient-shape landing-ambient-shape-primary left-[5%] top-8" aria-hidden="true" />
      <div className="landing-ambient-shape landing-ambient-shape-secondary bottom-6 right-[8%]" aria-hidden="true" />
      <ScrollReveal>
        <div className="relative mx-auto max-w-[1440px]">
          <SectionHeader
            eyebrow="Features"
            title="Everything needed to move from request to real progress"
            description="EduMatch keeps discovery, requests, sessions, simulated payments, chat, and reviews inside one focused learning workspace."
          />
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {features.map((feature, index) => (
              <FeatureCard key={feature.title} {...feature} delay={index * 55} />
            ))}
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}

export function StudentsSection() {
  return (
    <BenefitsSection
      id="students"
      eyebrow="For students"
      title="Find the right instructor for the exact help you need"
      description="Whether you are preparing for an exam, debugging a project, or learning a subject from scratch, EduMatch helps you request support with confidence."
      benefits={studentBenefits}
    />
  );
}

export function InstructorsSection() {
  return (
    <BenefitsSection
      id="instructors"
      eyebrow="For instructors"
      title="Turn your expertise into organized, trusted teaching work"
      description="EduMatch gives instructors a clear way to receive requests, manage learning sessions, and build a profile students can trust."
      benefits={instructorBenefits}
      flipped
    />
  );
}

export function PopularCategoriesSection() {
  return (
    <section id="categories" className="landing-section px-margin-mobile md:px-margin-desktop scroll-mt-24">
      <ScrollReveal>
        <div className="mx-auto max-w-[1440px]">
          <SectionHeader
            eyebrow="Popular categories"
            title="Explore high-demand learning topics"
            description="Start with relevant academic and technical categories, then shape the session around your exact goal."
          />
          <Reveal>
            <Marquee
              items={categories.map((category) => (
                <span className="inline-flex items-center gap-2 rounded-full border border-[var(--landing-border)] bg-[var(--landing-panel)] px-5 py-3 text-body-sm font-bold text-on-surface-variant backdrop-blur">
                  <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
                  {category}
                </span>
              ))}
            />
          </Reveal>
        </div>
      </ScrollReveal>
    </section>
  );
}

export function TestimonialsSection() {
  return (
    <section id="testimonials" className="landing-section px-margin-mobile md:px-margin-desktop scroll-mt-24">
      <ScrollReveal>
        <div className="mx-auto max-w-[1440px]">
          <SectionHeader
            eyebrow="Trust"
            title="Designed for clarity, safety, and academic workflows"
            description="EduMatch avoids scattered tools by keeping the learning marketplace flow in one protected platform."
          />
          <div className="grid gap-5 lg:grid-cols-3">
            {trustItems.map((item, index) => (
              <Reveal as="article" delay={index * 80} key={item.title} className="landing-card landing-tilt rounded-[var(--landing-radius-card)] border bg-[var(--landing-panel)] p-7 backdrop-blur transition-all duration-300 hover:border-secondary/40">
                <ShieldCheck className="mb-8 h-10 w-10 text-primary" aria-hidden="true" />
                <h3 className="mb-3 text-headline-md font-black text-on-background">{item.title}</h3>
                <p className="text-body-md text-on-surface-variant">{item.description}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}

export function FAQSection() {
  const [openItem, setOpenItem] = useState(faqs[0]?.question ?? "");

  return (
    <section id="faq" className="landing-section px-margin-mobile md:px-margin-desktop scroll-mt-24">
      <ScrollReveal>
        <div className="mx-auto max-w-[960px]">
          <SectionHeader
            eyebrow="FAQ"
            title="Questions before you start"
            description="Quick answers about how EduMatch works for students, instructors, sessions, and simulated payments."
          />
          <Reveal className="space-y-3">
            {faqs.map((faq) => {
              const isOpen = openItem === faq.question;
              return (
                <div
                  key={faq.question}
                  className={cn(
                    "rounded-2xl border bg-[var(--landing-panel)] px-5 py-4 backdrop-blur transition-all duration-300",
                    isOpen ? "border-primary/40 shadow-[0_0_30px_rgba(192,193,255,0.09)]" : "border-[var(--landing-border)]",
                  )}
                >
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-4 rounded-xl text-left font-bold text-on-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                    aria-expanded={isOpen}
                    onClick={() => setOpenItem((current) => (current === faq.question ? "" : faq.question))}
                  >
                    <span>{faq.question}</span>
                    <ChevronDown className={cn("h-5 w-5 shrink-0 text-primary transition-transform duration-300", isOpen && "rotate-180")} aria-hidden="true" />
                  </button>
                  <div className={cn("grid transition-[grid-template-rows] duration-300 ease-out", isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
                    <p className="overflow-hidden pt-3 text-body-sm text-on-surface-variant">{faq.answer}</p>
                  </div>
                </div>
              );
            })}
          </Reveal>
        </div>
      </ScrollReveal>
    </section>
  );
}

export function LandingCTASection() {
  return (
    <section id="cta" className="landing-section px-margin-mobile md:px-margin-desktop scroll-mt-24">
      <ScrollReveal>
        <div className="mx-auto max-w-[1440px]">
          <Reveal className="relative overflow-hidden rounded-[calc(var(--landing-radius-card)*1.15)] border border-[var(--landing-border-strong)] bg-[linear-gradient(135deg,rgba(31,31,43,0.96),rgba(16,17,28,0.94))] p-8 text-center shadow-[var(--landing-shadow-soft)] md:p-16">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(192,193,255,0.18),rgba(76,215,246,0.08),transparent_66%)]" aria-hidden="true" />
            <Sparkles className="absolute left-8 top-8 h-10 w-10 rotate-[-10deg] text-primary/25" aria-hidden="true" />
            <Code2 className="absolute bottom-8 right-8 h-12 w-12 rotate-12 text-secondary/25" aria-hidden="true" />
            <div className="relative z-10 mx-auto max-w-[46rem] space-y-6">
              <h2 className="landing-heading text-headline-lg font-black md:text-[44px] md:leading-[52px]">
                Ready to start learning with the right instructor?
              </h2>
              <p className="landing-copy text-body-lg">
                Join EduMatch and manage requests, sessions, simulated payments, and reviews from one focused platform.
              </p>
              <div className="flex flex-col justify-center gap-4 pt-4 sm:flex-row">
                <Link
                  to={ROUTES.REGISTER}
                  className={cn(
                    buttonVariants({ variant: "default" }),
                    "landing-button h-auto rounded-xl px-8 py-4 text-label-md font-bold shadow-[0_0_24px_rgba(192,193,255,0.24)]",
                  )}
                >
                  Get Started
                </Link>
                <Link
                  to={ROUTES.LOGIN}
                  className="landing-button inline-flex items-center justify-center rounded-xl border border-outline-variant bg-surface-variant px-8 py-4 text-label-md font-bold text-on-background transition-colors hover:bg-surface-container-highest"
                >
                  Sign In
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </ScrollReveal>
    </section>
  );
}
