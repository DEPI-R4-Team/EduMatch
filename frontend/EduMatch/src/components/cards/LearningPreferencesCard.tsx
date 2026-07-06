const subjects = ["React", "Frontend Development", "Databases", "Mathematics"];
const preferences = [
  { label: "Preferred Session Type", value: "Online" },
  { label: "Preferred Session Mode", value: "Individual and Group" },
  { label: "Learning Level", value: "Beginner to Intermediate" },
  { label: "Budget Range", value: "100 - 250 EGP per session" },
];

export function LearningPreferencesCard() {
  return (
    <section className="rounded-lg border border-[#27272A] bg-[#18181B] p-lg">
      <h2 className="text-headline-md text-zinc-100">Learning Preferences</h2>

      <div className="mt-lg">
        <p className="text-body-sm text-zinc-400">Interested Subjects</p>
        <div className="mt-sm flex flex-wrap gap-sm">
          {subjects.map((subject) => (
            <span
              className="rounded-full bg-primary/15 px-sm py-xs text-body-sm text-primary ring-1 ring-primary/25"
              key={subject}
            >
              {subject}
            </span>
          ))}
        </div>
      </div>

      <dl className="mt-lg grid gap-md md:grid-cols-2">
        {preferences.map((item) => (
          <div className="rounded-md border border-[#27272A] bg-[#121214] p-md" key={item.label}>
            <dt className="text-body-sm text-zinc-400">{item.label}</dt>
            <dd className="mt-xs text-body-sm font-medium text-zinc-100">{item.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
