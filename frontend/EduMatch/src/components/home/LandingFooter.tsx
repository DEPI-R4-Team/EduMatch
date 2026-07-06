import { Link } from "react-router-dom";
import { ROUTES } from "@/lib/routes";

const quickLinks = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#students", label: "Students" },
  { href: "#instructors", label: "Instructors" },
  { href: "#categories", label: "Categories" },
  { href: "#faq", label: "FAQ" },
] as const;

const platformLinks = [
  { to: ROUTES.LOGIN, label: "Login" },
  { to: ROUTES.REGISTER, label: "Register" },
  { to: ROUTES.STUDENT.INSTRUCTORS, label: "Browse Instructors" },
] as const;

export function LandingFooter() {
  return (
    <footer className="relative z-20 isolate overflow-hidden border-t border-[var(--landing-border)] bg-[var(--landing-bg-soft)] px-margin-mobile py-14 md:px-margin-desktop md:py-16">
      <div
        className="landing-ambient-shape landing-ambient-shape-primary -z-10 -left-16 bottom-10"
        aria-hidden="true"
      />
      <div
        className="landing-ambient-shape landing-ambient-shape-secondary -z-10 right-0 top-8"
        aria-hidden="true"
      />

      <div className="landing-reveal relative z-10 mx-auto max-w-[1440px]">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-[minmax(18rem,1.8fr)_minmax(9rem,1fr)_minmax(9rem,1fr)_minmax(10rem,1fr)]">
          <div className="w-full min-w-[min(100%,18rem)] max-w-[34rem] space-y-4 lg:pr-8">
            <Link
              to={ROUTES.HOME}
              className="landing-logo-link inline-flex items-center gap-2 rounded-md text-headline-md font-bold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-low"
            >
              <span
                className="material-symbols-outlined text-[26px]"
                style={{ fontVariationSettings: "'FILL' 0" }}
                aria-hidden="true"
              >
                school
              </span>
              EduMatch
            </Link>
            <p className="w-full text-body-sm text-on-surface-variant">
              EduMatch connects students with trusted instructors for focused academic sessions, clear
              requests, and organized learning progress.
            </p>
          </div>

          <div>
            <h2 className="mb-4 text-label-md font-semibold uppercase text-on-background">Quick Links</h2>
            <nav aria-label="Footer quick links">
              <ul className="space-y-3">
                {quickLinks.map((link) => (
                  <li key={link.href}>
                    <a className="landing-footer-link text-body-sm text-on-surface-variant" href={link.href}>
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          <div>
            <h2 className="mb-4 text-label-md font-semibold uppercase text-on-background">Platform</h2>
            <nav aria-label="Footer platform links">
              <ul className="space-y-3">
                {platformLinks.map((link) => (
                  <li key={link.to}>
                    <Link className="landing-footer-link text-body-sm text-on-surface-variant" to={link.to}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          <div>
            <h2 className="mb-4 text-label-md font-semibold uppercase text-on-background">Contact</h2>
            <address className="space-y-3 text-body-sm not-italic text-on-surface-variant">
              <p>Contact details can be configured by the deployment team.</p>
              <p>Cairo, Egypt</p>
              <p>Academic Graduation Project Simulation</p>
            </address>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-outline-variant pt-6 text-body-sm text-on-surface-variant md:flex-row md:items-center md:justify-between">
          <p>&copy; 2026 EduMatch. All rights reserved.</p>
          <p>Made for academic graduation project simulation.</p>
        </div>
      </div>
    </footer>
  );
}
