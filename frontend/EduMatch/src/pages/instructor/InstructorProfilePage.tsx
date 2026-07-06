import { type FormEvent, useEffect, useState } from "react";
import axios from "axios";
import {
  BadgeCheck,
  CircleDollarSign,
  LockKeyhole,
  Pencil,
  ShieldCheck,
  Star,
  Zap,
} from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import type { User } from "@/types/user";

function valueOrMissing(value: string | null | undefined) {
  return value?.trim() ? value : "Not added yet";
}

function initials(name: string | undefined) {
  return (name ?? "Instructor")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function splitList(value: string | null | undefined) {
  return value?.split(",").map((item) => item.trim()).filter(Boolean) ?? [];
}

type InstructorProfileForm = {
  full_name: string;
  email: string;
  phone: string;
  specialization: string;
  skills: string;
  experience: string;
  bio: string;
  price_per_session: string;
  is_available_for_instant: boolean;
  profile_image: string;
};

function formFromUser(user: User | null): InstructorProfileForm {
  const profile = user?.instructor_profile;
  return {
    full_name: user?.full_name ?? "",
    email: user?.email ?? "",
    phone: profile?.phone ?? "",
    specialization: profile?.specialization ?? "",
    skills: profile?.skills ?? "",
    experience: profile?.experience ?? "",
    bio: profile?.bio ?? "",
    price_per_session: profile?.price_per_session ?? "",
    is_available_for_instant: Boolean(profile?.is_available_for_instant),
    profile_image: profile?.profile_image ?? "",
  };
}

function parseApiError(error: unknown) {
  if (axios.isAxiosError(error)) {
    const detail = (error.response?.data as { detail?: unknown } | undefined)?.detail;
    if (typeof detail === "string") return detail;
  }
  return "Could not update profile. Please try again.";
}

export function InstructorProfilePage() {
  const { updateProfile, user } = useAuth();
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<InstructorProfileForm>(() => formFromUser(user));
  const profile = user?.instructor_profile;
  const skills = splitList(profile?.skills);

  useEffect(() => {
    if (!isEditing) {
      setForm(formFromUser(user));
    }
  }, [isEditing, user]);

  function startEditing() {
    setForm(formFromUser(user));
    setNotice("");
    setError("");
    setIsEditing(true);
  }

  function cancelEditing() {
    setForm(formFromUser(user));
    setIsEditing(false);
    setNotice("Unsaved profile changes were reset.");
    setError("");
  }

  function updateField(field: keyof InstructorProfileForm, value: string | boolean) {
    setForm((current) => ({ ...current, [field]: value }));
    setNotice("");
    setError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.full_name.trim() || !form.email.trim()) {
      setError("Full name and email are required.");
      return;
    }
    const price = form.price_per_session.trim() ? Number.parseFloat(form.price_per_session) : null;
    if (price !== null && (!Number.isFinite(price) || price <= 0)) {
      setError("Price per session must be a positive number.");
      return;
    }

    setIsSaving(true);
    try {
      await updateProfile({
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        phone: form.phone,
        specialization: form.specialization,
        skills: form.skills,
        experience: form.experience,
        bio: form.bio,
        price_per_session: price,
        is_available_for_instant: form.is_available_for_instant,
        profile_image: form.profile_image,
      });
      setIsEditing(false);
      setNotice("Profile updated successfully.");
      setError("");
    } catch (apiError) {
      setError(parseApiError(apiError));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <header className="sticky top-0 z-[60] bg-[#09090B]/95 backdrop-blur-xl border-b border-[#27272A] px-margin-mobile py-lg md:px-margin-desktop">
        <BackButton className="mb-md" fallback="/instructor/dashboard" />
        <h1 className="text-headline-lg text-zinc-100">Profile</h1>
        <p className="mt-xs max-w-2xl text-body-sm text-zinc-400">
          Manage your instructor profile and credentials.
        </p>
      </header>

      <div className="space-y-lg px-margin-mobile py-lg md:px-margin-desktop">
        {notice ? <p className="rounded-md border border-secondary/25 bg-secondary/10 px-md py-sm text-body-sm text-secondary">{notice}</p> : null}
        {error ? <p className="rounded-md border border-error/25 bg-error/10 px-md py-sm text-body-sm text-error">{error}</p> : null}

        <div className="grid gap-lg xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-lg">
            <section className="rounded-lg border border-[#27272A] bg-[#18181B] p-lg">
              <div className="flex flex-col gap-md sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-center gap-md">
                  <div className="flex size-16 items-center justify-center rounded-full bg-primary/15 text-headline-md font-medium text-primary">
                    {initials(user?.full_name)}
                  </div>
                  <div>
                    <div className="flex items-center gap-sm">
                      <h2 className="text-headline-md text-zinc-100">{valueOrMissing(user?.full_name)}</h2>
                      {profile?.verification_status === "verified" ? <BadgeCheck className="size-5 text-primary" /> : null}
                    </div>
                    <p className="text-body-sm text-zinc-400">{valueOrMissing(user?.email)}</p>
                    <p className="text-body-sm capitalize text-zinc-400">
                      {profile?.verification_status?.replaceAll("_", " ") ?? "Not added yet"}
                    </p>
                  </div>
                </div>
                <button className="inline-flex h-9 items-center justify-center gap-xs rounded-md border border-secondary/40 px-md text-body-sm font-medium text-secondary transition hover:bg-secondary/10" onClick={startEditing} type="button">
                  <Pencil className="size-4" />
                  Edit Profile
                </button>
              </div>
            </section>

            {isEditing ? (
              <form className="rounded-lg border border-[#27272A] bg-[#18181B] p-lg" onSubmit={(event) => void handleSubmit(event)}>
                <h2 className="text-headline-md text-zinc-100">Edit Instructor Profile</h2>
                <div className="mt-lg grid gap-md md:grid-cols-2">
                  <Field label="Full Name" value={form.full_name} onChange={(value) => updateField("full_name", value)} required />
                  <Field label="Email" type="email" value={form.email} onChange={(value) => updateField("email", value)} required />
                  <Field label="Phone" value={form.phone} onChange={(value) => updateField("phone", value)} />
                  <Field label="Specialization" value={form.specialization} onChange={(value) => updateField("specialization", value)} />
                  <Field label="Skills" value={form.skills} onChange={(value) => updateField("skills", value)} />
                  <Field label="Price Per Session" value={form.price_per_session} onChange={(value) => updateField("price_per_session", value)} />
                  <Field label="Profile Image URL" value={form.profile_image} onChange={(value) => updateField("profile_image", value)} />
                </div>
                <label className="mt-md flex items-center justify-between gap-md rounded-md border border-[#27272A] bg-[#121214] p-md text-body-sm text-zinc-100">
                  <span>Available for instant requests</span>
                  <input
                    checked={form.is_available_for_instant}
                    className="size-4 accent-primary"
                    onChange={(event) => updateField("is_available_for_instant", event.target.checked)}
                    type="checkbox"
                  />
                </label>
                <label className="mt-md block space-y-sm">
                  <span className="text-body-sm font-medium text-zinc-100">Experience</span>
                  <textarea
                    className="min-h-28 w-full resize-y rounded-md border border-[#27272A] bg-[#121214] px-md py-sm text-body-sm text-zinc-100 outline-none focus-visible:border-[#8b5cf6] focus-visible:ring-3 focus-visible:ring-[#8b5cf6]/30"
                    onChange={(event) => updateField("experience", event.target.value)}
                    value={form.experience}
                  />
                </label>
                <label className="mt-md block space-y-sm">
                  <span className="text-body-sm font-medium text-zinc-100">Bio</span>
                  <textarea
                    className="min-h-32 w-full resize-y rounded-md border border-[#27272A] bg-[#121214] px-md py-sm text-body-sm text-zinc-100 outline-none focus-visible:border-[#8b5cf6] focus-visible:ring-3 focus-visible:ring-[#8b5cf6]/30"
                    onChange={(event) => updateField("bio", event.target.value)}
                    value={form.bio}
                  />
                </label>
                <div className="mt-lg flex flex-wrap justify-end gap-sm">
                  <button className="inline-flex h-10 items-center justify-center rounded-md border border-[#27272A] px-md text-body-sm text-zinc-400 transition hover:bg-[#27272A] hover:text-zinc-100" onClick={cancelEditing} type="button">
                    Cancel
                  </button>
                  <button className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-md text-body-sm font-medium text-on-primary transition hover:bg-primary/90 disabled:opacity-60" disabled={isSaving} type="submit">
                    {isSaving ? "Saving..." : "Save Profile"}
                  </button>
                </div>
              </form>
            ) : null}

            <section className="rounded-lg border border-[#27272A] bg-[#18181B] p-lg">
              <div className="flex items-center justify-between gap-md">
                <h2 className="text-headline-md text-zinc-100">About</h2>
                <button className="inline-flex h-9 items-center justify-center gap-xs rounded-md border border-secondary/40 px-md text-body-sm font-medium text-secondary transition hover:bg-secondary/10" onClick={startEditing} type="button">
                  <Pencil className="size-4" />
                  Edit
                </button>
              </div>
              <p className="mt-md text-body-sm leading-relaxed text-zinc-400">{valueOrMissing(profile?.bio)}</p>
            </section>

            <section className="rounded-lg border border-[#27272A] bg-[#18181B] p-lg">
              <h2 className="text-headline-md text-zinc-100">Specialization</h2>
              <p className="mt-md text-body-sm text-zinc-400">{valueOrMissing(profile?.specialization)}</p>
            </section>

            <section className="rounded-lg border border-[#27272A] bg-[#18181B] p-lg">
              <h2 className="text-headline-md text-zinc-100">Experience</h2>
              <p className="mt-md text-body-sm leading-relaxed text-zinc-400">{valueOrMissing(profile?.experience)}</p>
            </section>

            <section className="rounded-lg border border-[#27272A] bg-[#18181B] p-lg">
              <h2 className="text-headline-md text-zinc-100">Skills</h2>
              {skills.length > 0 ? (
                <div className="mt-md flex flex-wrap gap-sm">
                  {skills.map((skill) => (
                    <span className="rounded-full bg-secondary/15 px-sm py-xs text-label-md text-secondary ring-1 ring-secondary/25" key={skill}>
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-md text-body-sm text-zinc-400">Not added yet</p>
              )}
            </section>

            <section className="rounded-lg border border-[#27272A] bg-[#18181B] p-lg">
              <div className="flex items-start gap-md">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-secondary/15 text-secondary">
                  <ShieldCheck className="size-5" />
                </div>
                <div>
                  <h2 className="text-headline-md text-zinc-100">Security</h2>
                  <p className="mt-xs text-body-sm text-zinc-400">Password management is not connected yet.</p>
                </div>
              </div>
              <div className="mt-lg space-y-sm">
                <button className="flex h-10 w-full items-center gap-sm rounded-md border border-[#27272A] bg-[#121214] px-md text-body-sm text-zinc-400 transition hover:bg-[#27272A] hover:text-zinc-100" onClick={() => setNotice("Password change is not implemented yet.")} type="button">
                  <LockKeyhole className="size-4" />
                  Change Password
                </button>
              </div>
            </section>
          </div>

          <aside className="space-y-lg">
            <section className="rounded-lg border border-[#27272A] bg-[#18181B] p-lg">
              <h2 className="text-headline-md text-zinc-100">Quick Stats</h2>
              <div className="mt-md space-y-md">
                <div className="flex items-center gap-sm text-body-sm">
                  <Star className="size-4 fill-tertiary text-tertiary" />
                  <span className="text-zinc-100">{profile?.rating ?? "0.0"} rating</span>
                </div>
                <div className="flex items-center gap-sm text-body-sm">
                  <CircleDollarSign className="size-4 text-primary" />
                  <span className="text-zinc-100">{valueOrMissing(profile?.price_per_session)} per session</span>
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-[#27272A] bg-[#18181B] p-lg">
              <h2 className="text-headline-md text-zinc-100">Availability</h2>
              <div className="mt-md flex items-center justify-between">
                <div className="flex items-center gap-sm text-body-sm">
                  <Zap className="size-4 text-tertiary" />
                  <span className="text-zinc-100">Instant Availability</span>
                </div>
                <span className={cn("rounded-full px-sm py-xs text-label-md", profile?.is_available_for_instant ? "bg-emerald-400/15 text-emerald-300" : "bg-on-surface-variant/15 text-zinc-400")}>
                  {profile?.is_available_for_instant ? "Active" : "Inactive"}
                </span>
              </div>
            </section>

            <section className="rounded-lg border border-[#27272A] bg-[#18181B] p-lg">
              <h2 className="text-headline-md text-zinc-100">Verification</h2>
              <div className="mt-md flex items-center gap-sm">
                <BadgeCheck className="size-5 text-primary" />
                <span className="text-body-sm capitalize text-zinc-100">
                  {profile?.verification_status?.replaceAll("_", " ") ?? "Not added yet"}
                </span>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </>
  );
}

function Field({
  label,
  onChange,
  required = false,
  type = "text",
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
  value: string;
}) {
  return (
    <label className="space-y-sm">
      <span className="text-body-sm font-medium text-zinc-100">{label}</span>
      <Input
        className="h-11 border-[#27272A] bg-[#121214] text-zinc-100"
        onChange={(event) => onChange(event.target.value)}
        required={required}
        type={type}
        value={value}
      />
    </label>
  );
}
