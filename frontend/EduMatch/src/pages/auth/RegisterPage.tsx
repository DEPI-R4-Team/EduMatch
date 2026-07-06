import { Link } from "react-router-dom";
import { StarField } from "@/components/animations/StarField";
import { InputWithIcon } from "@/components/InputWithIcon";
import { RoleSelector } from "@/components/RoleSelector";
import { Button } from "@/components/ui/button";
import { useRegister } from "@/hooks/useRegister";
import { ROUTES } from "@/lib/routes";

const inputClass =
  "rounded-lg border-white/10 bg-[#111] pr-md text-white placeholder:text-gray-500 focus-visible:border-[#8b5cf6] focus-visible:ring-1 focus-visible:ring-[#8b5cf6]";

export function RegisterPage() {
  const { form, role, setRole, loading, error, handleChange, handleSubmit } =
    useRegister();

  return (
    <div className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-[#030303] p-md font-body-md text-white">
      <StarField />
      <div className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-[38rem] w-[38rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#8b5cf6]/20 blur-[130px]" aria-hidden="true" />

      <main className="relative z-10 flex w-full max-w-112 flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0a0a0a]/90 p-8 shadow-[0_28px_90px_rgba(0,0,0,0.45)] backdrop-blur-xl">
        <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-[#8b5cf6]/50 to-transparent" aria-hidden="true" />

        <header className="mb-xl text-center">
          <h1 className="mb-sm text-headline-md font-headline-md text-white">
            EduMatch
          </h1>
          <h2 className="mb-xs hidden text-headline-lg font-headline-lg text-white md:block">
            Create an Account
          </h2>
          <h2 className="mb-xs text-headline-lg-mobile font-headline-lg-mobile text-white md:hidden">
            Create an Account
          </h2>
          <p className="text-body-sm font-body-sm text-gray-400">
            Join the academic portal to manage your learning requests.
          </p>
        </header>

        <form className="flex flex-col gap-lg" onSubmit={handleSubmit} noValidate>
          <RoleSelector value={role} onChange={setRole} />

          <div className="flex flex-col gap-md">
            <div className="flex flex-col gap-xs">
              <label className="text-label-md font-label-md text-white" htmlFor="fullName">
                Full Name
              </label>
              <InputWithIcon
                icon="person"
                id="fullName"
                name="fullName"
                type="text"
                placeholder="Jane Doe"
                autoComplete="name"
                required
                value={form.fullName}
                onChange={handleChange}
                className={inputClass}
              />
            </div>

            <div className="flex flex-col gap-xs">
              <label className="text-label-md font-label-md text-white" htmlFor="email">
                Email Address
              </label>
              <InputWithIcon
                icon="mail"
                id="email"
                name="email"
                type="email"
                placeholder="jane.doe@university.edu"
                autoComplete="email"
                required
                value={form.email}
                onChange={handleChange}
                className={inputClass}
              />
            </div>

            <div className="flex flex-col gap-xs">
              <label className="text-label-md font-label-md text-white" htmlFor="password">
                Password
              </label>
              <InputWithIcon
                icon="lock"
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                autoComplete="new-password"
                required
                value={form.password}
                onChange={handleChange}
                className={inputClass}
              />
            </div>

            <div className="flex flex-col gap-xs">
              <label className="text-label-md font-label-md text-white" htmlFor="confirmPassword">
                Confirm Password
              </label>
              <InputWithIcon
                icon="lock_reset"
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="••••••••"
                autoComplete="new-password"
                required
                value={form.confirmPassword}
                onChange={handleChange}
                className={inputClass}
              />
            </div>

            <div className="flex flex-col gap-xs">
              <label className="text-label-md font-label-md text-white" htmlFor="phone">
                Phone <span className="text-gray-400">(optional)</span>
              </label>
              <InputWithIcon
                icon="call"
                id="phone"
                name="phone"
                type="tel"
                placeholder="01012345678"
                autoComplete="tel"
                value={form.phone}
                onChange={handleChange}
                className={inputClass}
              />
            </div>

            {role === "student" ? (
              <div className="flex flex-col gap-xs">
                <label className="text-label-md font-label-md text-white" htmlFor="educationLevel">
                  Education Level <span className="text-gray-400">(optional)</span>
                </label>
                <InputWithIcon
                  icon="school"
                  id="educationLevel"
                  name="educationLevel"
                  type="text"
                  placeholder="Engineering Student"
                  autoComplete="organization-title"
                  value={form.educationLevel}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>
            ) : (
              <div className="flex flex-col gap-xs">
                <label className="text-label-md font-label-md text-white" htmlFor="specialization">
                  Specialization <span className="text-gray-400">(optional)</span>
                </label>
                <InputWithIcon
                  icon="history_edu"
                  id="specialization"
                  name="specialization"
                  type="text"
                  placeholder="React Instructor"
                  autoComplete="organization-title"
                  value={form.specialization}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>
            )}
          </div>

          {error && (
            <p className="text-body-sm text-red-300" role="alert">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="mt-sm h-auto w-full cursor-pointer gap-xs rounded-xl bg-[#8b5cf6] py-md text-label-md font-label-md text-white shadow-[0_0_20px_rgba(139,92,246,0.2)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#7c3aed] disabled:opacity-60"
          >
            {loading ? "Creating account…" : "Register"}
            {!loading && (
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "18px" }}
                aria-hidden="true"
              >
                arrow_forward
              </span>
            )}
          </Button>
        </form>

        <div className="mt-lg text-center">
          <span className="text-body-sm font-body-sm text-gray-400">
            Already have an account?{" "}
          </span>
          <Link
            to={ROUTES.LOGIN}
            className="text-body-sm font-body-sm text-[#a78bfa] underline decoration-transparent underline-offset-4 transition-colors hover:text-white hover:decoration-[#a78bfa]"
          >
            Login
          </Link>
        </div>
      </main>
    </div>
  );
}
