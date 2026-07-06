import { type FormEvent, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import {
  BadgeDollarSign,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Info,
  Users,
  Zap,
} from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MIN_SESSION_PRICE, minimumPriceMessage } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { createRequest } from "@/services/requests.service";

type FormState = {
  subject: string;
  description: string;
  learningLevel: string;
  language: string;
  budget: string;
};

const initialForm: FormState = {
  subject: "",
  description: "",
  learningLevel: "",
  language: "English",
  budget: "",
};

function FieldLabel({ children }: { children: string }) {
  return <label className="text-body-sm font-medium text-zinc-100">{children}</label>;
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="text-body-sm text-destructive">{message}</p>;
}

function RequestTypeCard({
  active = false,
  description,
  icon: Icon,
  label,
  onClick,
}: {
  active?: boolean;
  description: string;
  icon: typeof CalendarClock;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "flex min-h-28 w-full items-start gap-md rounded-lg border p-md text-left transition",
        active
          ? "border-primary bg-primary/10 shadow-[0_0_24px_rgba(192,193,255,0.12)]"
          : "border-[#27272A] bg-[#121214] hover:border-primary/50 hover:bg-[#27272A]",
      )}
      onClick={onClick}
      type="button"
    >
      <span
        className={cn(
          "mt-1 flex size-10 shrink-0 items-center justify-center rounded-md",
          active ? "bg-primary text-on-primary" : "bg-secondary/15 text-secondary",
        )}
      >
        <Icon className="size-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-body-md font-medium text-zinc-100">{label}</span>
        <span className="mt-xs block text-body-sm leading-relaxed text-zinc-400">{description}</span>
      </span>
    </button>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-md">
      <span className="text-zinc-400">{label}</span>
      <span className="text-right font-medium text-zinc-100">{value}</span>
    </div>
  );
}

function FinancialsCard({
  budget,
  budgetError,
  isSubmitting,
  onBudgetChange,
  onDraft,
}: {
  budget: string;
  budgetError?: string;
  isSubmitting: boolean;
  onBudgetChange: (value: string) => void;
  onDraft: () => void;
}) {
  return (
    <aside className="rounded-lg border border-[#27272A] bg-[#18181B] p-lg xl:sticky xl:top-24">
      <div className="mb-lg flex items-center gap-sm">
        <div className="flex size-9 items-center justify-center rounded-md bg-secondary/15 text-secondary">
          <BadgeDollarSign className="size-5" />
        </div>
        <h2 className="text-headline-md text-zinc-100">Financials</h2>
      </div>

      <div className="space-y-sm">
        <FieldLabel>Base Offer / Budget</FieldLabel>
        <Input
          className="h-11 border-[#27272A] bg-[#121214] text-zinc-100"
          min={MIN_SESSION_PRICE}
          onChange={(event) => onBudgetChange(event.target.value)}
          placeholder="100 EGP"
          type="number"
          value={budget}
        />
        <p className="text-body-sm text-zinc-400">Minimum session price: {MIN_SESSION_PRICE} EGP.</p>
        <FieldError message={budgetError} />
      </div>

      <div className="my-lg space-y-sm rounded-md border border-[#27272A] bg-[#121214] p-md text-body-sm">
        <SummaryRow label="Request Type" value="Normal Request" />
        <SummaryRow label="Session Mode" value="Individual" />
        <SummaryRow label="Estimated Price" value={budget || "Not set"} />
        <SummaryRow label="Payment Status" value="Not required until instructor accepts" />
      </div>

      <div className="space-y-sm">
        <Button className="h-11 w-full bg-primary text-on-primary hover:bg-primary/90" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Posting..." : "Post Request"}
        </Button>
        <Button
          className="h-11 w-full border-[#27272A] bg-transparent text-zinc-100 hover:bg-[#27272A]"
          onClick={onDraft}
          type="button"
          variant="outline"
        >
          Save Draft
        </Button>
      </div>

      <p className="mt-md text-center text-body-sm text-zinc-400">
        Payment will only be requested after an instructor accepts your request.
      </p>
    </aside>
  );
}

export function CreateRequestPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const instructorId = searchParams.get("instructorId");
  const [form, setForm] = useState<FormState>(initialForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [successMessage, setSuccessMessage] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setSuccessMessage("");
    setSubmitError("");
  }

  function validateForm() {
    const nextErrors: Partial<Record<keyof FormState, string>> = {};

    if (!form.subject.trim()) nextErrors.subject = "Subject is required.";
    if (!form.description.trim()) nextErrors.description = "Description is required.";
    if (!form.learningLevel) nextErrors.learningLevel = "Learning level is required.";
    if (!form.budget.trim()) nextErrors.budget = "Budget is required.";
    const budget = Number.parseFloat(form.budget);
    if (form.budget.trim() && (!Number.isFinite(budget) || budget < MIN_SESSION_PRICE)) {
      nextErrors.budget = minimumPriceMessage();
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");
    try {
      await createRequest({
        title: `${form.subject.trim()} Help`,
        subject: form.subject.trim(),
        description: form.description.trim(),
        level: form.learningLevel || undefined,
        request_type: "normal",
        session_mode: "individual",
        session_type: "online",
        base_price: Number.parseFloat(form.budget),
        final_price_per_student: form.budget ? Number.parseFloat(form.budget) : undefined,
      });
      setSuccessMessage("Request created successfully.");
      window.setTimeout(() => navigate("/student/requests", { state: { refreshRequestsAt: Date.now() } }), 500);
    } catch (error) {
      setSubmitError(parseApiError(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleDraft() {
    localStorage.setItem("studentRequestDraft", JSON.stringify(form));
    setSuccessMessage("Draft saved successfully.");
  }

  return (
    <>
      <header className="sticky top-0 z-[60] bg-[#09090B]/95 backdrop-blur-xl border-b border-[#27272A] px-margin-mobile py-lg md:px-margin-desktop">
        <div>
          <BackButton className="mb-md" fallback="/student/requests" />
          <div className="mb-sm flex items-center gap-sm text-label-md uppercase text-zinc-400">
            <span>Requests</span>
            <ChevronRight className="size-4" />
            <span className="text-secondary">New</span>
          </div>
          <h1 className="text-headline-lg text-zinc-100">Create Learning Request</h1>
          <p className="mt-xs max-w-3xl text-body-sm text-zinc-400">
            Choose the type of help you need, then add clear details so instructors can respond with confidence.
          </p>
        </div>
      </header>

      <form
        className="grid gap-lg px-margin-mobile py-lg md:px-margin-desktop xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]"
        onSubmit={handleSubmit}
      >
        <div className="space-y-lg">
          {successMessage ? (
            <div className="flex items-start gap-sm rounded-lg border border-emerald-400/25 bg-emerald-400/10 p-md text-body-sm text-emerald-200">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
              {successMessage}
            </div>
          ) : null}
          {instructorId ? (
            <div className="flex items-start gap-sm rounded-lg border border-secondary/25 bg-secondary/10 p-md text-body-sm text-secondary">
              <Info className="mt-0.5 size-4 shrink-0" />
              Request will be created with this instructor in mind. Direct assignment is not enabled yet.
            </div>
          ) : null}
          {submitError ? (
            <div className="rounded-lg border border-error/25 bg-error/10 p-md text-body-sm text-error">
              {submitError}
            </div>
          ) : null}

          <section className="rounded-lg border border-[#27272A] bg-[#18181B] p-lg">
            <h2 className="text-headline-md text-zinc-100">Choose Request Type</h2>
            <div className="mt-lg grid gap-md lg:grid-cols-3">
              <RequestTypeCard
                active
                description="Create a standard one-on-one request and review instructor applications."
                icon={CalendarClock}
                label="Normal Request"
                onClick={() => undefined}
              />
              <RequestTypeCard
                description="Invite classmates and split the session cost through the group flow."
                icon={Users}
                label="Group Request"
                onClick={() => navigate("/student/group-requests/create")}
              />
              <RequestTypeCard
                description="Post an urgent request for available instructors to accept quickly."
                icon={Zap}
                label="Instant Request"
                onClick={() => navigate("/student/instant-requests/create")}
              />
            </div>
          </section>

          <section className="rounded-lg border border-[#27272A] bg-[#18181B] p-lg">
            <h2 className="text-headline-md text-zinc-100">Core Details</h2>

            <div className="mt-lg space-y-md">
              <div className="space-y-sm">
                <FieldLabel>Subject</FieldLabel>
                <Input
                  aria-invalid={Boolean(errors.subject)}
                  className="h-11 border-[#27272A] bg-[#121214] text-zinc-100"
                  onChange={(event) => updateField("subject", event.target.value)}
                  placeholder="e.g. Advanced Calculus, React, Machine Learning 101"
                  value={form.subject}
                />
                <p className="text-body-sm text-zinc-400">
                  Be specific to attract specialized instructors.
                </p>
                <FieldError message={errors.subject} />
              </div>

              <div className="space-y-sm">
                <FieldLabel>Description</FieldLabel>
                <textarea
                  aria-invalid={Boolean(errors.description)}
                  className="min-h-36 w-full resize-y rounded-md border border-[#27272A] bg-[#121214] px-md py-sm text-body-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus-visible:border-[#8b5cf6] focus-visible:ring-3 focus-visible:ring-[#8b5cf6]/30"
                  onChange={(event) => updateField("description", event.target.value)}
                  placeholder="Describe what you want to learn, your current understanding, and specific goals..."
                  value={form.description}
                />
                <FieldError message={errors.description} />
              </div>

              <div className="grid gap-md md:grid-cols-2">
                <div className="space-y-sm">
                  <FieldLabel>Learning Level</FieldLabel>
                  <select
                    aria-invalid={Boolean(errors.learningLevel)}
                    className="h-11 w-full rounded-md border border-[#27272A] bg-[#121214] px-md text-body-sm text-zinc-100 outline-none transition focus-visible:border-[#8b5cf6] focus-visible:ring-3 focus-visible:ring-[#8b5cf6]/30"
                    onChange={(event) => updateField("learningLevel", event.target.value)}
                    value={form.learningLevel}
                  >
                    <option value="">Select level</option>
                    <option>Beginner</option>
                    <option>Intermediate</option>
                    <option>Advanced</option>
                  </select>
                  <FieldError message={errors.learningLevel} />
                </div>

                <div className="space-y-sm">
                  <FieldLabel>Preferred Language</FieldLabel>
                  <select
                    className="h-11 w-full rounded-md border border-[#27272A] bg-[#121214] px-md text-body-sm text-zinc-100 outline-none transition focus-visible:border-[#8b5cf6] focus-visible:ring-3 focus-visible:ring-[#8b5cf6]/30"
                    onChange={(event) => updateField("language", event.target.value)}
                    value={form.language}
                  >
                    <option>English</option>
                    <option>Arabic</option>
                    <option>French</option>
                  </select>
                </div>
              </div>
            </div>
          </section>
        </div>

        <FinancialsCard
          budget={form.budget}
          budgetError={errors.budget}
          isSubmitting={isSubmitting}
          onBudgetChange={(value) => updateField("budget", value)}
          onDraft={handleDraft}
        />
      </form>
    </>
  );
}

function parseApiError(error: unknown) {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return "Cannot connect to server. Check VITE_API_BASE_URL and make sure the backend is running.";
    }
    const detail = (error.response.data as { detail?: unknown })?.detail;
    if (typeof detail === "string") return detail;
  }
  return "Could not create request. Please try again.";
}
