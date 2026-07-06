type TrustFeature = {
  icon: string;
  label: string;
  iconColor: string;
};

const FEATURES: TrustFeature[] = [
  { icon: "bolt", label: "Instant matching", iconColor: "text-primary" },
  { icon: "group", label: "Group discounts", iconColor: "text-secondary" },
  { icon: "shield", label: "Secure held payments", iconColor: "text-tertiary" },
  { icon: "verified", label: "Verified instructors", iconColor: "text-primary" },
  { icon: "star", label: "Verified reviews", iconColor: "text-secondary" },
];

export function TrustStrip() {
  return (
    <div className="relative border-y border-[var(--landing-border)] bg-[linear-gradient(90deg,rgba(192,193,255,0.06),rgba(76,215,246,0.05),rgba(255,183,131,0.05))] py-6 backdrop-blur">
      <div className="max-w-[1440px] mx-auto px-margin-mobile md:px-margin-desktop">
        <ul className="landing-reveal flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-body-sm font-bold text-on-surface-variant md:justify-between">
          {FEATURES.map((feature, index) => (
            <li key={feature.label} className="landing-card flex items-center gap-2 rounded-full border border-transparent px-3 py-2 transition-all duration-300 hover:border-[var(--landing-border)] hover:bg-[var(--landing-panel)]" style={{ transitionDelay: `${index * 40}ms` }}>
              <span
                className={`material-symbols-outlined text-[18px] ${feature.iconColor}`}
                style={{ fontVariationSettings: "'FILL' 0" }}
                aria-hidden="true"
              >
                {feature.icon}
              </span>
              {feature.label}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
