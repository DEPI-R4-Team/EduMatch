import { StarField } from "@/components/animations/StarField";
import { HeroSection } from "@/components/home/HeroSection";
import { HowItWorks } from "@/components/home/HowItWorks";
import { LandingFooter } from "@/components/home/LandingFooter";
import { LandingMotion } from "@/components/home/LandingMotion";
import {
  FAQSection,
  FeaturesSection,
  InstructorsSection,
  LandingCTASection,
  PopularCategoriesSection,
  StudentsSection,
  TestimonialsSection,
} from "@/components/home/LandingSections";
import { TrustStrip } from "@/components/home/TrustStrip";

export function HomePage() {
  return (
    <div className="relative isolate overflow-hidden bg-[#030303]">
      <StarField />
      <LandingMotion />
      <div className="relative z-10">
        <HeroSection />
        <TrustStrip />
        <HowItWorks />
        <FeaturesSection />
        <StudentsSection />
        <InstructorsSection />
        <PopularCategoriesSection />
        <TestimonialsSection />
        <FAQSection />
        <LandingCTASection />
        <LandingFooter />
      </div>
    </div>
  );
}
