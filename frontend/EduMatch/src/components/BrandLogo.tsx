type BrandLogoProps = {
  subtitle?: string;
};

export function BrandLogo({ subtitle = "Sign in to your academic portal" }: BrandLogoProps) {
  return (
    <div className="text-center mb-xl">
      <h1 className="mb-sm text-headline-xl font-headline-xl text-white">EduMatch</h1>
      <p className="text-body-md font-body-md text-gray-400">{subtitle}</p>
    </div>
  );
}
