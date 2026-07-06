import { useState } from "react";

const initialSettings = {
  applicationUpdates: true,
  paymentUpdates: true,
  sessionReminders: true,
  marketingEmails: false,
};

export function StudentSettingsPage() {
  const [settings, setSettings] = useState(initialSettings);
  const [savedSettings, setSavedSettings] = useState(initialSettings);
  const [message, setMessage] = useState("");

  function toggleSetting(key: keyof typeof settings) {
    setSettings((current) => ({ ...current, [key]: !current[key] }));
    setMessage("");
  }

  function handleSave() {
    setSavedSettings(settings);
    setMessage("Settings saved successfully.");
  }

  function handleCancel() {
    setSettings(savedSettings);
    setMessage("Unsaved settings were reset.");
  }

  return (
    <>
      <header className="sticky top-0 z-[60] bg-[#09090B]/95 backdrop-blur-xl border-b border-[#27272A] px-margin-mobile py-lg md:px-margin-desktop">
        <h1 className="text-headline-lg text-zinc-100">Settings</h1>
        <p className="mt-xs max-w-2xl text-body-sm text-zinc-400">
          Manage local dashboard preferences for this academic version.
        </p>
      </header>

      <div className="space-y-lg px-margin-mobile py-lg md:px-margin-desktop">
        {message ? (
          <p className="rounded-md border border-secondary/25 bg-secondary/10 px-md py-sm text-body-sm text-secondary">
            {message}
          </p>
        ) : null}

        <section className="rounded-lg border border-[#27272A] bg-[#18181B] p-lg">
          <h2 className="text-headline-md text-zinc-100">Notifications</h2>
          <div className="mt-lg space-y-sm">
            {[
              ["applicationUpdates", "Instructor application updates"],
              ["paymentUpdates", "Payment and escrow updates"],
              ["sessionReminders", "Session reminders"],
              ["marketingEmails", "Academic newsletter"],
            ].map(([key, label]) => (
              <label
                className="flex items-center justify-between gap-md rounded-md border border-[#27272A] bg-[#121214] p-md text-body-sm text-zinc-100"
                key={key}
              >
                <span>{label}</span>
                <input
                  checked={settings[key as keyof typeof settings]}
                  className="size-4 accent-primary"
                  onChange={() => toggleSetting(key as keyof typeof settings)}
                  type="checkbox"
                />
              </label>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-[#27272A] bg-[#18181B] p-lg">
          <h2 className="text-headline-md text-zinc-100">Theme</h2>
          <p className="mt-sm text-body-sm text-zinc-400">
            Dark mode is kept as the default project theme.
          </p>
        </section>

        <div className="flex flex-wrap gap-sm">
          <button
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-md text-body-sm font-medium text-on-primary transition hover:bg-primary/90"
            onClick={handleSave}
            type="button"
          >
            Save Settings
          </button>
          <button
            className="inline-flex h-10 items-center justify-center rounded-md border border-[#27272A] px-md text-body-sm text-zinc-400 transition hover:bg-[#27272A] hover:text-zinc-100"
            onClick={handleCancel}
            type="button"
          >
            Cancel
          </button>
        </div>
      </div>
    </>
  );
}
