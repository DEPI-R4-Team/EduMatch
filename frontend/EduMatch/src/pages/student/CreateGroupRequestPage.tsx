import { type FormEvent, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { createGroupRequest } from "@/services/groupRequests.service";
import { BackButton } from "@/components/ui/BackButton";
import { Input } from "@/components/ui/input";
import { MIN_SESSION_PRICE, minimumPriceMessage } from "@/lib/pricing";

type FormState = {
  title: string;
  subject: string;
  description: string;
  level: string;
  basePrice: string;
  minPrice: string;
  maxParticipants: string;
  preferredDatetime: string;
};

const initialForm: FormState = {
  title: "",
  subject: "",
  description: "",
  level: "",
  basePrice: "",
  minPrice: "",
  maxParticipants: "4",
  preferredDatetime: "",
};

function calc(base: number, min: number, count: number) {
  if (!base || !min || !count) return "Not set";
  return `${Math.max(min, Math.ceil(base / count)).toFixed(2)} EGP`;
}

function validatePrice(value: string) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed >= MIN_SESSION_PRICE;
}

function parseApiError(error: unknown) {
  if (axios.isAxiosError(error)) {
    if (!error.response) return "Cannot connect to server. Make sure the backend is running.";
    const detail = (error.response.data as { detail?: unknown })?.detail;
    if (typeof detail === "string") return detail;
  }
  return "Could not create group request.";
}

export function CreateGroupRequestPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(initialForm);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const preview = useMemo(() => {
    const base = Number.parseFloat(form.basePrice);
    const min = Number.parseFloat(form.minPrice);
    const max = Number.parseInt(form.maxParticipants, 10);
    return {
      one: calc(base, min, 1),
      two: calc(base, min, 2),
      max: calc(base, min, max),
    };
  }, [form.basePrice, form.maxParticipants, form.minPrice]);

  function update(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setError("");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!validatePrice(form.basePrice) || !validatePrice(form.minPrice)) {
      setError(minimumPriceMessage());
      return;
    }
    setSubmitting(true);
    try {
      const group = await createGroupRequest({
        title: form.title.trim(),
        subject: form.subject.trim(),
        description: form.description.trim(),
        level: form.level || undefined,
        base_price: Number.parseFloat(form.basePrice),
        min_price_per_student: Number.parseFloat(form.minPrice),
        max_participants: Number.parseInt(form.maxParticipants, 10),
        preferred_datetime: form.preferredDatetime || undefined,
      });
      navigate(`/student/group-requests/${group.id}`);
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <header className="sticky top-0 z-[60] bg-[#09090B]/95 backdrop-blur-xl border-b border-[#27272A] px-margin-mobile py-lg md:px-margin-desktop">
        <BackButton className="mb-md" fallback="/student/requests/create" />
        <h1 className="text-headline-lg text-zinc-100">Create Group Request</h1>
        <p className="mt-xs max-w-2xl text-body-sm text-zinc-400">
          The session cost is shared between active group members. As more students join, the price per student decreases until it reaches the minimum price per student.
        </p>
      </header>
      <form className="grid gap-lg px-margin-mobile py-lg md:px-margin-desktop xl:grid-cols-[minmax(0,1fr)_340px]" onSubmit={submit}>
        <section className="space-y-md rounded-lg border border-[#27272A] bg-[#18181B] p-lg">
          {error ? <p className="rounded-md border border-error/25 bg-error/10 px-md py-sm text-body-sm text-error">{error}</p> : null}
          <Input className="h-11 border-[#27272A] bg-[#121214] text-zinc-100" onChange={(e) => update("title", e.target.value)} placeholder="Title" required value={form.title} />
          <Input className="h-11 border-[#27272A] bg-[#121214] text-zinc-100" onChange={(e) => update("subject", e.target.value)} placeholder="Subject" required value={form.subject} />
          <textarea className="min-h-36 rounded-md border border-[#27272A] bg-[#121214] px-md py-sm text-body-sm text-zinc-100 outline-none" onChange={(e) => update("description", e.target.value)} placeholder="Describe what the group wants to learn..." required value={form.description} />
          <div className="grid gap-md md:grid-cols-2">
            <Input className="h-11 border-[#27272A] bg-[#121214] text-zinc-100" onChange={(e) => update("level", e.target.value)} placeholder="Level" value={form.level} />
            <Input className="h-11 border-[#27272A] bg-[#121214] text-zinc-100" onChange={(e) => update("preferredDatetime", e.target.value)} type="datetime-local" value={form.preferredDatetime} />
            <Input className="h-11 border-[#27272A] bg-[#121214] text-zinc-100" min={MIN_SESSION_PRICE} onChange={(e) => update("basePrice", e.target.value)} placeholder="Base group session price" required type="number" value={form.basePrice} />
            <Input className="h-11 border-[#27272A] bg-[#121214] text-zinc-100" min={MIN_SESSION_PRICE} onChange={(e) => update("minPrice", e.target.value)} placeholder="Minimum price per student" required type="number" value={form.minPrice} />
            <Input className="h-11 border-[#27272A] bg-[#121214] text-zinc-100" min="2" onChange={(e) => update("maxParticipants", e.target.value)} placeholder="Max participants" required type="number" value={form.maxParticipants} />
          </div>
        </section>
        <aside className="rounded-lg border border-[#27272A] bg-[#18181B] p-lg xl:sticky xl:top-24">
          <h2 className="text-headline-md text-zinc-100">Live Price Preview</h2>
          <p className="mt-xs text-body-sm text-zinc-400">Minimum allowed price: {MIN_SESSION_PRICE} EGP per student.</p>
          <div className="mt-md space-y-sm text-body-sm">
            <p className="flex justify-between text-zinc-400"><span>1 participant</span><b className="text-zinc-100">{preview.one}</b></p>
            <p className="flex justify-between text-zinc-400"><span>2 participants</span><b className="text-zinc-100">{preview.two}</b></p>
            <p className="flex justify-between text-zinc-400"><span>Max participants</span><b className="text-zinc-100">{preview.max}</b></p>
          </div>
          <button className="mt-lg h-10 w-full rounded-md bg-primary text-body-sm font-medium text-on-primary hover:bg-primary/90 disabled:opacity-50" disabled={submitting} type="submit">
            {submitting ? "Creating..." : "Create Group Request"}
          </button>
        </aside>
      </form>
    </>
  );
}
