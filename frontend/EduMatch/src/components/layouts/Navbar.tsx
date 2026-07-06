import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";

const NAV_LINKS = [
  { href: "#how-it-works", label: "How It Works" },
  { href: "#features", label: "Features" },
  { href: "#students", label: "Students" },
  { href: "#instructors", label: "Instructors" },
  { href: "#categories", label: "Categories" },
  { href: "#faq", label: "FAQ" },
] as const;

function isHTMLElement(element: HTMLElement | null): element is HTMLElement {
  return element !== null;
}

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("");

  useEffect(() => {
    const updateHomeActiveState = () => {
      if (window.scrollY < 160) {
        setActiveSection("");
      }
    };

    const sectionElements = NAV_LINKS.map((link) =>
      document.querySelector<HTMLElement>(link.href),
    ).filter(isHTMLElement);

    updateHomeActiveState();
    window.addEventListener("scroll", updateHomeActiveState, { passive: true });

    if (!("IntersectionObserver" in window) || !sectionElements.length) {
      return () => window.removeEventListener("scroll", updateHomeActiveState);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visibleEntry?.target.id) {
          setActiveSection(`#${visibleEntry.target.id}`);
        }
      },
      {
        rootMargin: "-20% 0px -60% 0px",
        threshold: [0.1, 0.25, 0.5],
      },
    );

    sectionElements.forEach((section) => observer.observe(section));

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", updateHomeActiveState);
    };
  }, []);

  return (
    <nav className="bg-background/80 backdrop-blur-md border-b border-outline-variant fixed top-0 left-0 right-0 z-50 h-16">
      <div className="max-w-[1440px] mx-auto px-margin-mobile md:px-margin-desktop h-full flex justify-between items-center">
        {/* Logo + desktop nav */}
        <div className="flex items-center gap-8">
          <Link
            to={ROUTES.HOME}
            className="landing-logo-link text-headline-md font-headline-md font-bold text-primary flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <span
              className="material-symbols-outlined text-[24px]"
              style={{ fontVariationSettings: "'FILL' 0" }}
              aria-hidden="true"
            >
              school
            </span>
            EduMatch
          </Link>

          <div className="hidden lg:flex gap-6 items-center">
            <Link
              to={ROUTES.HOME}
              className={cn(
                "landing-nav-link text-body-sm font-bold",
                activeSection === "" && "is-active",
              )}
            >
              Home
            </Link>
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={cn(
                  "landing-nav-link text-body-sm",
                  activeSection === link.href && "is-active",
                )}
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <Link
            to={ROUTES.LOGIN}
            className="landing-nav-action hidden rounded-md px-2 py-1 text-body-sm font-medium text-on-surface-variant sm:block"
          >
            Login
          </Link>
          <Link
            to={ROUTES.REGISTER}
            className={cn(
              buttonVariants({ variant: "default" }),
              "landing-nav-button px-5 py-2.5 h-auto rounded-lg text-label-md font-semibold shadow-[0_0_15px_rgba(192,193,255,0.2)] hover:opacity-90",
            )}
          >
            Get Started
          </Link>
          <button
            type="button"
            className="landing-nav-icon-button inline-flex h-10 w-10 items-center justify-center rounded-lg border border-outline-variant bg-surface-container text-on-background lg:hidden"
            aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={isOpen}
            onClick={() => setIsOpen((open) => !open)}
          >
            {isOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="border-t border-outline-variant bg-background/95 px-margin-mobile py-4 shadow-[0_18px_50px_rgba(0,0,0,0.25)] backdrop-blur-md lg:hidden">
          <div className="mx-auto flex max-w-[1440px] flex-col gap-2">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={cn(
                  "landing-mobile-nav-link rounded-lg px-3 py-2 text-body-sm",
                  activeSection === link.href && "is-active",
                )}
                onClick={() => setIsOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <Link
              to={ROUTES.LOGIN}
              className="landing-mobile-nav-link rounded-lg px-3 py-2 text-body-sm font-medium sm:hidden"
              onClick={() => setIsOpen(false)}
            >
              Login
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
