import { CheckCircle2, Circle } from "lucide-react";

const checklist = [
  { label: "Personal info completed", done: true },
  { label: "Email verified", done: true },
  { label: "Learning preferences added", done: true },
  { label: "Profile photo missing", done: false },
];

export function ProfileCompletionCard() {
  return (
    <section className="rounded-lg border border-[#27272A] bg-[#18181B] p-lg">
      <div className="flex items-center justify-between gap-md">
        <h2 className="text-headline-md text-zinc-100">Profile Completion</h2>
        <span className="text-body-sm font-medium text-primary">85%</span>
      </div>
      <div className="mt-md h-2 rounded-full bg-[#121214]">
        <div className="h-2 w-[85%] rounded-full bg-primary" />
      </div>
      <div className="mt-lg space-y-sm">
        {checklist.map((item) => (
          <div className="flex items-center gap-sm text-body-sm" key={item.label}>
            {item.done ? (
              <CheckCircle2 className="size-4 text-emerald-300" />
            ) : (
              <Circle className="size-4 text-zinc-400" />
            )}
            <span className={item.done ? "text-zinc-100" : "text-zinc-400"}>{item.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
