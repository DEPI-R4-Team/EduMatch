import { Link } from "react-router-dom";
import { NotificationsDropdown } from "@/components/layout/NotificationsDropdown";
import { useAuth } from "@/hooks/useAuth";
import { ROUTES } from "@/lib/routes";

function initials(name: string | undefined) {
  return (name ?? "User")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function DashboardTopbarActions() {
  const { user } = useAuth();
  const profileImage =
    user?.role === "student"
      ? user.student_profile?.profile_image
      : user?.role === "instructor"
        ? user.instructor_profile?.profile_image
        : null;
  const profilePath =
    user?.role === "student"
      ? ROUTES.STUDENT.PROFILE
      : user?.role === "instructor"
        ? ROUTES.INSTRUCTOR.PROFILE
        : ROUTES.ADMIN.DASHBOARD;

  return (
    <div className="flex shrink-0 items-center justify-end gap-3">
      <NotificationsDropdown />
      <Link
        aria-label="View profile"
        className="flex size-10 items-center justify-center overflow-hidden rounded-full border border-[#27272A] bg-[#18181B] text-zinc-200 transition-colors hover:bg-white/5"
        to={profilePath}
      >
        {profileImage ? (
          <img alt="" className="size-full object-cover" src={profileImage} />
        ) : (
          <span className="text-body-sm font-medium">{initials(user?.full_name)}</span>
        )}
      </Link>
    </div>
  );
}
