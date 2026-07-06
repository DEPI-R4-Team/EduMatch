import { type FormEvent, useEffect, useState } from "react";
import axios from "axios";
import { LockKeyhole, Pencil, ShieldCheck } from "lucide-react";
import { ProfileHeaderCard } from "@/components/cards/ProfileHeaderCard";
import { QuickActionsCard } from "@/components/cards/QuickActionsCard";
import { BackButton } from "@/components/ui/BackButton";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import type { User } from "@/types/user";

function BioCard({ bio, onEdit }: { bio: string | null | undefined; onEdit: () => void }) {
  return (
    <section className="rounded-lg border border-[#27272A] bg-[#18181B] p-lg">
      <div className="flex items-center justify-between gap-md">
        <h2 className="text-headline-md text-zinc-100">About Me</h2>
        <button
          className="inline-flex h-9 items-center justify-center gap-xs rounded-md border border-secondary/40 px-md text-body-sm font-medium text-secondary transition hover:bg-secondary/10"
          onClick={onEdit}
          type="button"
        >
          <Pencil className="size-4" />
          Edit
        </button>
      </div>
      <p className="mt-md text-body-sm text-zinc-400">
        {bio?.trim() ? bio : "Not added yet"}
      </p>
    </section>
  );
}

function SecurityCard({ onMessage }: { onMessage: (message: string) => void }) {
  return (
    <section className="rounded-lg border border-[#27272A] bg-[#18181B] p-lg">
      <div className="flex items-start gap-md">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-secondary/15 text-secondary">
          <ShieldCheck className="size-5" />
        </div>
        <div>
          <h2 className="text-headline-md text-zinc-100">Security</h2>
          <p className="mt-xs text-body-sm text-zinc-400">
            Password: Last changed recently
          </p>
        </div>
      </div>

      <div className="mt-lg space-y-sm">
        <button
          className="flex h-10 w-full items-center gap-sm rounded-md border border-[#27272A] bg-[#121214] px-md text-body-sm text-zinc-400 transition hover:bg-[#27272A] hover:text-zinc-100"
          onClick={() => onMessage("Password change is not implemented yet.")}
          type="button"
        >
          <LockKeyhole className="size-4 text-secondary" />
          Change Password
        </button>
        <button
          className="flex h-10 w-full items-center gap-sm rounded-md border border-[#27272A] bg-[#121214] px-md text-body-sm text-zinc-400 transition hover:bg-[#27272A] hover:text-zinc-100"
          onClick={() => onMessage("Login session management is not implemented yet.")}
          type="button"
        >
          <ShieldCheck className="size-4 text-secondary" />
          Manage Login Sessions
        </button>
      </div>
    </section>
  );
}

type StudentProfileForm = {
  full_name: string;
  email: string;
  phone: string;
  education_level: string;
  university: string;
  department: string;
  preferred_language: string;
  location: string;
  bio: string;
  profile_image: string;
};

function valueOrMissing(value: string | null | undefined) {
  return value?.trim() ? value : "Not added yet";
}

function formFromUser(user: User | null): StudentProfileForm {
  const profile = user?.student_profile;
  return {
    full_name: user?.full_name ?? "",
    email: user?.email ?? "",
    phone: profile?.phone ?? "",
    education_level: profile?.education_level ?? "",
    university: profile?.university ?? "",
    department: profile?.department ?? "",
    preferred_language: profile?.preferred_language ?? "",
    location: profile?.location ?? "",
    bio: profile?.bio ?? "",
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

function InfoGrid({ user }: { user: User | null }) {
  const profile = user?.student_profile;
  const personalInfo = [
    { label: "Full Name", value: valueOrMissing(user?.full_name) },
    { label: "Email", value: valueOrMissing(user?.email) },
    { label: "Phone", value: valueOrMissing(profile?.phone) },
    { label: "Education Level", value: valueOrMissing(profile?.education_level) },
    { label: "University", value: valueOrMissing(profile?.university) },
    { label: "Department", value: valueOrMissing(profile?.department) },
    { label: "Preferred Language", value: valueOrMissing(profile?.preferred_language) },
    { label: "Location", value: valueOrMissing(profile?.location) },
    { label: "Profile Image URL", value: valueOrMissing(profile?.profile_image) },
  ];

  return (
    <section className="rounded-lg border border-[#27272A] bg-[#18181B] p-lg">
      <h2 className="text-headline-md text-zinc-100">Personal Information</h2>
      <dl className="mt-lg grid gap-md md:grid-cols-2">
        {personalInfo.map((item) => (
          <div className="rounded-md border border-[#27272A] bg-[#121214] p-md" key={item.label}>
            <dt className="text-body-sm text-zinc-400">{item.label}</dt>
            <dd className="mt-xs break-words text-body-sm font-medium text-zinc-100">{item.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function StudentProfileEditForm({
  form,
  isSaving,
  onCancel,
  onChange,
  onSubmit,
}: {
  form: StudentProfileForm;
  isSaving: boolean;
  onCancel: () => void;
  onChange: (field: keyof StudentProfileForm, value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="rounded-lg border border-[#27272A] bg-[#18181B] p-lg" onSubmit={onSubmit}>
      <h2 className="text-headline-md text-zinc-100">Edit Profile</h2>
      <div className="mt-lg grid gap-md md:grid-cols-2">
        <Field label="Full Name" value={form.full_name} onChange={(value) => onChange("full_name", value)} required />
        <Field label="Email" type="email" value={form.email} onChange={(value) => onChange("email", value)} required />
        <Field label="Phone" value={form.phone} onChange={(value) => onChange("phone", value)} />
        <Field label="Education Level" value={form.education_level} onChange={(value) => onChange("education_level", value)} />
        <Field label="University" value={form.university} onChange={(value) => onChange("university", value)} />
        <Field label="Department" value={form.department} onChange={(value) => onChange("department", value)} />
        <Field label="Preferred Language" value={form.preferred_language} onChange={(value) => onChange("preferred_language", value)} />
        <Field label="Location" value={form.location} onChange={(value) => onChange("location", value)} />
        <Field label="Profile Image URL" value={form.profile_image} onChange={(value) => onChange("profile_image", value)} />
      </div>
      <label className="mt-md block space-y-sm">
        <span className="text-body-sm font-medium text-zinc-100">Bio</span>
        <textarea
          className="min-h-32 w-full resize-y rounded-md border border-[#27272A] bg-[#121214] px-md py-sm text-body-sm text-zinc-100 outline-none focus-visible:border-[#8b5cf6] focus-visible:ring-3 focus-visible:ring-[#8b5cf6]/30"
          onChange={(event) => onChange("bio", event.target.value)}
          value={form.bio}
        />
      </label>
      <div className="mt-lg flex flex-wrap justify-end gap-sm">
        <button className="inline-flex h-10 items-center justify-center rounded-md border border-[#27272A] px-md text-body-sm text-zinc-400 transition hover:bg-[#27272A] hover:text-zinc-100" onClick={onCancel} type="button">
          Cancel
        </button>
        <button className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-md text-body-sm font-medium text-on-primary transition hover:bg-primary/90 disabled:opacity-60" disabled={isSaving} type="submit">
          {isSaving ? "Saving..." : "Save Profile"}
        </button>
      </div>
    </form>
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

export function ProfilePage() {
  const { updateProfile, user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<StudentProfileForm>(() => formFromUser(user));
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isEditing) {
      setForm(formFromUser(user));
    }
  }, [isEditing, user]);

  function startEditing() {
    setForm(formFromUser(user));
    setMessage("");
    setError("");
    setIsEditing(true);
  }

  function cancelEditing() {
    setForm(formFromUser(user));
    setIsEditing(false);
    setMessage("Unsaved profile changes were reset.");
    setError("");
  }

  function updateField(field: keyof StudentProfileForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setMessage("");
    setError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.full_name.trim() || !form.email.trim()) {
      setError("Full name and email are required.");
      return;
    }
    setIsSaving(true);
    try {
      await updateProfile({
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        phone: form.phone,
        education_level: form.education_level,
        university: form.university,
        department: form.department,
        preferred_language: form.preferred_language,
        location: form.location,
        bio: form.bio,
        profile_image: form.profile_image,
      });
      setIsEditing(false);
      setMessage("Profile updated successfully.");
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
        <div>
          <BackButton className="mb-md" fallback="/student/dashboard" />
          <h1 className="text-headline-lg text-zinc-100">My Profile</h1>
          <p className="mt-xs max-w-2xl text-body-sm text-zinc-400">
            Manage your personal information and learning preferences.
          </p>
        </div>
      </header>

      <div className="space-y-lg px-margin-mobile py-lg md:px-margin-desktop">
        {message ? (
          <p className="rounded-md border border-secondary/25 bg-secondary/10 px-md py-sm text-body-sm text-secondary">
            {message}
          </p>
        ) : null}
        {error ? (
          <p className="rounded-md border border-error/25 bg-error/10 px-md py-sm text-body-sm text-error">
            {error}
          </p>
        ) : null}

        <ProfileHeaderCard
          user={user}
          onChangePhoto={() => setMessage("File upload is not available yet. You can edit the profile image URL in Edit Profile.")}
          onEditProfile={startEditing}
        />

        <div className="grid gap-lg 2xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
          <main className="min-w-0 space-y-lg">
            {isEditing ? (
              <StudentProfileEditForm
                form={form}
                isSaving={isSaving}
                onCancel={cancelEditing}
                onChange={updateField}
                onSubmit={(event) => void handleSubmit(event)}
              />
            ) : (
              <InfoGrid user={user} />
            )}
            <BioCard bio={user?.student_profile?.bio} onEdit={startEditing} />
          </main>

          <aside className="space-y-lg">
            <QuickActionsCard />
            <SecurityCard onMessage={setMessage} />
          </aside>
        </div>
      </div>
    </>
  );
}
