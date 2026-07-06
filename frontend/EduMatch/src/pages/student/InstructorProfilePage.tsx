import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { BadgeCheck, BriefcaseBusiness, CircleDollarSign, Star, Zap } from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { cn } from "@/lib/utils";
import { getInstructorById, getInstructorReviews } from "@/services/instructors.service";
import type { InstructorDetail } from "@/types/instructor";
import type { Review } from "@/types/review";

function initials(name: string | undefined) {
  return (name ?? "Instructor")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function splitSkills(value: string | null | undefined) {
  return value?.split(",").map((skill) => skill.trim()).filter(Boolean) ?? [];
}

function valueOrMissing(value: string | null | undefined, fallback = "Not added yet") {
  return value?.trim() ? value : fallback;
}

function formatRating(value: string | null | undefined) {
  const rating = Number.parseFloat(value ?? "0");
  return rating > 0 ? rating.toFixed(1) : "No ratings yet";
}

function formatPrice(value: string | null | undefined) {
  const price = Number.parseFloat(value ?? "0");
  return price > 0 ? `${price.toFixed(2)} EGP` : "Not set";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value));
}

function verificationClass(status: InstructorDetail["verification_status"]) {
  if (status === "verified") {
    return "bg-emerald-400/15 text-emerald-300 ring-emerald-400/25";
  }
  if (status === "pending_verification") {
    return "bg-tertiary/15 text-tertiary ring-tertiary/25";
  }
  return "bg-error/15 text-error ring-error/25";
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5 text-tertiary">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star className={cn("size-4", star <= rating && "fill-current")} key={star} />
      ))}
    </div>
  );
}

export function InstructorProfilePage() {
  const { instructorId } = useParams();
  const [instructor, setInstructor] = useState<InstructorDetail | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadInstructor() {
      const id = Number(instructorId);
      if (!Number.isInteger(id) || id <= 0) {
        setError("Instructor not found.");
        setLoading(false);
        return;
      }

      try {
        const [instructorData, reviewData] = await Promise.all([
          getInstructorById(id),
          getInstructorReviews(id),
        ]);
        setInstructor(instructorData);
        setReviews(reviewData);
        setError("");
      } catch {
        setError("Instructor not found or unavailable.");
      } finally {
        setLoading(false);
      }
    }

    void loadInstructor();
  }, [instructorId]);

  const skills = splitSkills(instructor?.skills);
  const ratingValue = Number.parseFloat(instructor?.rating ?? "0");

  return (
    <>
      <header className="sticky top-0 z-[60] bg-[#09090B]/95 backdrop-blur-xl border-b border-[#27272A] px-margin-mobile py-lg md:px-margin-desktop">
        <BackButton fallback="/student/instructors" />
        <p className="mt-md text-label-md uppercase text-secondary">Instructor Profile</p>
        <h1 className="mt-xs text-headline-lg text-zinc-100">
          {instructor?.full_name ?? "Instructor profile"}
        </h1>
        <p className="mt-xs max-w-2xl text-body-sm text-zinc-400">
          Review instructor details and create a learning request when ready.
        </p>
      </header>

      <div className="space-y-lg px-margin-mobile py-lg md:px-margin-desktop">
        {error ? <ErrorState message={error} /> : null}
        {loading ? <LoadingState message="Loading instructor profile..." /> : null}

        {!loading && instructor ? (
          <div className="grid gap-lg xl:grid-cols-[minmax(0,1fr)_340px]">
            <main className="space-y-lg">
              <section className="rounded-lg border border-[#27272A] bg-[#18181B] p-lg">
                <div className="flex flex-col gap-md sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-center gap-md">
                    <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-primary text-body-md font-semibold text-on-primary">
                      {initials(instructor.full_name)}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-sm">
                        <h2 className="text-headline-md text-zinc-100">{instructor.full_name}</h2>
                        <span className={cn("inline-flex items-center gap-xs rounded-full px-sm py-xs text-label-md uppercase ring-1", verificationClass(instructor.verification_status))}>
                          <BadgeCheck className="size-4" />
                          {instructor.verification_status.replaceAll("_", " ")}
                        </span>
                      </div>
                      <p className="mt-xs text-body-sm text-zinc-400">
                        {valueOrMissing(instructor.specialization)}
                      </p>
                      <div className="mt-sm flex flex-wrap items-center gap-sm text-body-sm text-zinc-400">
                        <span className="inline-flex items-center gap-xs text-tertiary">
                          <Star className={cn("size-4", ratingValue > 0 && "fill-current")} />
                          {formatRating(instructor.rating)}
                        </span>
                        <span>{instructor.total_reviews} reviews</span>
                        <span
                          className={cn(
                            "inline-flex items-center gap-xs rounded-full px-sm py-xs text-label-md uppercase",
                            instructor.is_available_for_instant
                              ? "bg-emerald-400/15 text-emerald-300"
                              : "bg-on-surface-variant/15 text-zinc-400",
                          )}
                        >
                          <Zap className="size-3.5" />
                          {instructor.is_available_for_instant ? "Available" : "Not available"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-lg border border-[#27272A] bg-[#18181B] p-lg">
                <h2 className="text-headline-md text-zinc-100">About</h2>
                <p className="mt-md text-body-sm leading-relaxed text-zinc-400">
                  {valueOrMissing(instructor.bio, "No bio added yet")}
                </p>
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
                  <p className="mt-md text-body-sm text-zinc-400">No skills added yet</p>
                )}
              </section>

              <section className="rounded-lg border border-[#27272A] bg-[#18181B] p-lg">
                <h2 className="text-headline-md text-zinc-100">Reviews</h2>
                <div className="mt-md space-y-md">
                  {reviews.length > 0 ? (
                    reviews.map((review) => (
                      <article className="rounded-md border border-[#27272A] bg-[#121214] p-md" key={review.id}>
                        <div className="flex flex-col gap-sm sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-body-md font-medium text-zinc-100">{review.student_name ?? "Student"}</p>
                            <p className="text-body-sm text-zinc-400">{review.session_title ?? "Learning Session"}</p>
                          </div>
                          <p className="text-body-sm text-zinc-400">{formatDate(review.created_at)}</p>
                        </div>
                        <div className="mt-sm">
                          <StarRating rating={review.rating} />
                        </div>
                        <p className="mt-sm text-body-sm text-zinc-400">{review.comment ?? "No comment."}</p>
                      </article>
                    ))
                  ) : (
                    <EmptyState message="Student reviews will appear here after completed sessions." title="No reviews yet" />
                  )}
                </div>
              </section>
            </main>

            <aside className="space-y-lg">
              <section className="rounded-lg border border-[#27272A] bg-[#18181B] p-lg">
                <h2 className="text-headline-md text-zinc-100">Profile Details</h2>
                <dl className="mt-md space-y-md text-body-sm">
                  <div className="flex items-start gap-sm">
                    <BriefcaseBusiness className="mt-0.5 size-4 shrink-0 text-secondary" />
                    <div>
                      <dt className="text-zinc-400">Experience</dt>
                      <dd className="mt-xs text-zinc-100">{valueOrMissing(instructor.experience)}</dd>
                    </div>
                  </div>
                  <div className="flex items-start gap-sm">
                    <CircleDollarSign className="mt-0.5 size-4 shrink-0 text-primary" />
                    <div>
                      <dt className="text-zinc-400">Pricing</dt>
                      <dd className="mt-xs text-zinc-100">{formatPrice(instructor.price_per_session)}</dd>
                    </div>
                  </div>
                  <div>
                    <dt className="text-zinc-400">Completed sessions</dt>
                    <dd className="mt-xs text-zinc-100">{instructor.completed_sessions_count}</dd>
                  </div>
                </dl>
              </section>

              <section className="rounded-lg border border-[#27272A] bg-[#18181B] p-lg">
                <h2 className="text-headline-md text-zinc-100">Actions</h2>
                <div className="mt-lg grid gap-sm">
                  <Link className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-md text-body-sm font-medium text-on-primary transition hover:bg-primary/90" to={`/student/requests/create?instructorId=${instructor.id}`}>
                    Create Request
                  </Link>
                  <Link className="inline-flex h-10 items-center justify-center rounded-md border border-secondary/40 px-md text-body-sm font-medium text-secondary transition hover:bg-secondary/10" to="/student/instructors">
                    Back to Instructors
                  </Link>
                </div>
              </section>
            </aside>
          </div>
        ) : null}
      </div>
    </>
  );
}
