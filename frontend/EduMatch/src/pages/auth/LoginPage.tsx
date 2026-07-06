import { Link } from "react-router-dom";
import { StarField } from "@/components/animations/StarField";
import { BrandLogo } from "@/components/BrandLogo";
import { InputWithIcon } from "@/components/InputWithIcon";
import { Button } from "@/components/ui/button";
import { useLogin } from "@/hooks/useLogin";
import { ROUTES } from "@/lib/routes";

export function LoginPage() {
  const { credentials, loading, error, successMessage, handleChange, handleSubmit } = useLogin();

  return (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-[#030303] p-margin-mobile font-body-md text-white md:p-margin-desktop">
      <StarField />
      <div className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#8b5cf6]/20 blur-[130px]" aria-hidden="true" />

      <div className="relative z-10 w-full max-w-112 overflow-hidden rounded-3xl border border-white/10 bg-[#0a0a0a]/90 p-8 shadow-[0_28px_90px_rgba(0,0,0,0.45)] backdrop-blur-xl">
        <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-[#8b5cf6]/50 to-transparent" aria-hidden="true" />

        <BrandLogo />

        <form className="space-y-md" onSubmit={handleSubmit} noValidate>
          {/* Email */}
          <div>
            <label
              className="mb-sm block text-label-md font-label-md text-white"
              htmlFor="email"
            >
              Email Address
            </label>
            <InputWithIcon
              icon="mail"
              id="email"
              name="email"
              type="email"
              placeholder="student@university.edu"
              autoComplete="email"
              required
              value={credentials.email}
              onChange={handleChange}
              className="border-white/10 bg-[#111] text-white placeholder:text-gray-500 focus-visible:border-[#8b5cf6] focus-visible:ring-1 focus-visible:ring-[#8b5cf6]"
            />
          </div>

          {/* Password */}
          <div>
            <div className="flex justify-between items-center mb-sm">
              <label
                className="block text-label-md font-label-md text-white"
                htmlFor="password"
              >
                Password
              </label>
              <Link
                to={ROUTES.FORGOT_PASSWORD}
                className="text-label-md font-label-md text-[#a78bfa] transition-colors hover:text-white"
              >
                Forgot Password?
              </Link>
            </div>
            <InputWithIcon
              icon="lock"
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              required
              value={credentials.password}
              onChange={handleChange}
              className="border-white/10 bg-[#111] text-white placeholder:text-gray-500 focus-visible:border-[#8b5cf6] focus-visible:ring-1 focus-visible:ring-[#8b5cf6]"
            />
          </div>

          {/* API error */}
          {successMessage && !error && (
            <p className="text-body-sm text-[#a78bfa]" role="status">
              {successMessage}
            </p>
          )}

          {error && (
            <p className="text-body-sm text-red-300" role="alert">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="mt-xl h-auto w-full cursor-pointer rounded-xl bg-[#8b5cf6] py-3 text-label-md font-label-md text-white shadow-[0_0_20px_rgba(139,92,246,0.2)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#7c3aed] disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Login"}
          </Button>
        </form>

        <div className="mt-lg text-center">
          <p className="text-body-sm font-body-sm text-gray-400">
            Don&apos;t have an account?{" "}
            <Link
              to={ROUTES.REGISTER}
              className="font-bold text-[#a78bfa] transition-colors hover:text-white"
            >
              Register
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
