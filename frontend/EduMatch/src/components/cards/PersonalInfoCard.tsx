import { useState } from "react";
import { Pencil } from "lucide-react";
import type { User } from "@/types/user";

type PersonalInfoCardProps = {
  user: User | null;
  onCancel?: () => void;
  onEdit?: () => void;
  onSave?: () => void;
};

function valueOrMissing(value: string | null | undefined) {
  return value?.trim() ? value : "Not added yet";
}

export function PersonalInfoCard({ user, onCancel, onEdit, onSave }: PersonalInfoCardProps) {
  const [editing, setEditing] = useState(false);
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
  ];

  function handleEditToggle() {
    const nextEditing = !editing;
    setEditing(nextEditing);
    if (nextEditing) {
      onEdit?.();
    } else {
      onCancel?.();
    }
  }

  return (
    <section className="rounded-lg border border-[#27272A] bg-[#18181B] p-lg">
      <div className="flex items-center justify-between gap-md">
        <h2 className="text-headline-md text-zinc-100">Personal Information</h2>
        <button className="inline-flex h-9 items-center justify-center gap-xs rounded-md border border-secondary/40 px-md text-body-sm font-medium text-secondary transition hover:bg-secondary/10" onClick={handleEditToggle} type="button">
          <Pencil className="size-4" />
          {editing ? "Cancel" : "Edit"}
        </button>
      </div>

      <dl className="mt-lg grid gap-md md:grid-cols-2">
        {personalInfo.map((item) => (
          <div className="rounded-md border border-[#27272A] bg-[#121214] p-md" key={item.label}>
            <dt className="text-body-sm text-zinc-400">{item.label}</dt>
            <dd className="mt-xs text-body-sm font-medium text-zinc-100">{item.value}</dd>
          </div>
        ))}
      </dl>

      {editing ? (
        <div className="mt-lg flex justify-end gap-sm">
          <button className="inline-flex h-10 items-center justify-center rounded-md border border-[#27272A] px-md text-body-sm text-zinc-400 transition hover:bg-[#27272A] hover:text-zinc-100" onClick={() => { setEditing(false); onCancel?.(); }} type="button">
            Cancel
          </button>
          <button className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-md text-body-sm font-medium text-on-primary transition hover:bg-primary/90" onClick={() => { setEditing(false); onSave?.(); }} type="button">
            Save
          </button>
        </div>
      ) : null}
    </section>
  );
}
