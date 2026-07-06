import { cn } from "@/lib/utils";
import type { RegisterRole } from "@/types/auth";

export type { RegisterRole as Role };

type RoleOption = {
  value: RegisterRole;
  label: string;
  icon: string;
};

const ROLES: RoleOption[] = [
  { value: "student", label: "Student", icon: "school" },
  { value: "instructor", label: "Instructor", icon: "history_edu" },
];

type RoleSelectorProps = {
  value: RegisterRole;
  onChange: (role: RegisterRole) => void;
};

export function RoleSelector({ value, onChange }: RoleSelectorProps) {
  return (
    <div className="flex flex-col gap-xs">
      <span className="text-label-md font-label-md text-white">Select Role</span>
      <div className="grid grid-cols-2 gap-md">
        {ROLES.map((role) => {
          const isActive = value === role.value;
          return (
            <button
              key={role.value}
              type="button"
              onClick={() => onChange(role.value)}
              aria-pressed={isActive}
              className={cn(
                "group flex cursor-pointer flex-col items-center gap-sm rounded-xl border p-md transition-all duration-200 hover:-translate-y-0.5",
                isActive
                  ? "border-[#8b5cf6]/50 bg-[#8b5cf6]/10 shadow-[0_0_20px_rgba(139,92,246,0.12)]"
                  : "border-white/10 bg-white/5 hover:border-[#8b5cf6]/30 hover:bg-white/[0.07]",
              )}
            >
              <span
                className={cn(
                  "material-symbols-outlined group-hover:scale-110",
                  isActive
                    ? "text-[#a78bfa] transition-transform"
                    : "text-gray-400 transition-all group-hover:text-white",
                )}
                style={{ fontSize: "32px", fontVariationSettings: "'FILL' 0" }}
                aria-hidden="true"
              >
                {role.icon}
              </span>
              <span className="text-label-md font-label-md text-white">{role.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
