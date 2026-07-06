import { useEffect, useMemo, useState } from "react";
import { Star } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { cn } from "@/lib/utils";
import { getMyReviews } from "@/services/reviews.service";
import type { Review } from "@/types/review";

function StarRating({ rating, size = "size-4" }: { rating: number; size?: string }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          className={cn(size, i < rating ? "fill-tertiary text-tertiary" : "text-outline")}
          key={i}
        />
      ))}
    </div>
  );
}

function initials(name: string | null) {
  return (name ?? "Student")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value));
}

export function InstructorReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadReviews() {
      try {
        const data = await getMyReviews();
        setReviews(data);
        setError("");
      } catch {
        setError("Could not load reviews. Make sure the backend is running.");
      } finally {
        setLoading(false);
      }
    }

    void loadReviews();
  }, []);

  const overallRating = useMemo(
    () => (reviews.length > 0 ? reviews.reduce((total, review) => total + review.rating, 0) / reviews.length : 0),
    [reviews],
  );
  const ratingDistribution = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: reviews.filter((review) => review.rating === stars).length,
  }));

  return (
    <>
      <header className="sticky top-0 z-[60] bg-[#09090B]/95 backdrop-blur-xl border-b border-[#27272A] px-margin-mobile py-lg md:px-margin-desktop">
        <h1 className="text-headline-lg text-zinc-100">Reviews</h1>
        <p className="mt-xs max-w-2xl text-body-sm text-zinc-400">
          Student ratings and feedback from completed sessions.
        </p>
      </header>

      <div className="space-y-lg px-margin-mobile py-lg md:px-margin-desktop">
        {error ? <ErrorState message={error} /> : null}
        {loading ? <LoadingState message="Loading reviews..." /> : null}

        <div className="grid gap-lg lg:grid-cols-[300px_minmax(0,1fr)]">
          <section className="rounded-lg border border-[#27272A] bg-[#18181B] p-lg">
            <div className="text-center">
              <p className="text-display-lg text-zinc-100">{reviews.length > 0 ? overallRating.toFixed(1) : "0.0"}</p>
              <StarRating rating={Math.round(overallRating)} size="size-5" />
              <p className="mt-sm text-body-sm text-zinc-400">Based on {reviews.length} reviews</p>
            </div>

            <div className="mt-lg space-y-sm">
              {ratingDistribution.map((entry) => (
                <div className="flex items-center gap-sm" key={entry.stars}>
                  <span className="w-4 text-right text-body-sm text-zinc-400">{entry.stars}</span>
                  <Star className="size-3.5 fill-tertiary text-tertiary" />
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-variant">
                    <div
                      className="h-full rounded-full bg-tertiary"
                      style={{ width: `${reviews.length > 0 ? (entry.count / reviews.length) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="w-6 text-right text-body-sm text-zinc-400">{entry.count}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-md">
            {reviews.length > 0 ? (
              reviews.map((review) => (
                <article className="rounded-lg border border-[#27272A] bg-[#18181B] p-lg" key={review.id}>
                  <div className="flex items-start justify-between gap-md">
                    <div className="flex items-center gap-sm">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/20 text-body-sm font-medium text-primary">
                        {initials(review.student_name)}
                      </span>
                      <div>
                        <p className="text-body-md font-medium text-zinc-100">{review.student_name ?? "Student"}</p>
                        <p className="text-body-sm text-zinc-400">{review.session_title ?? "Learning Session"}</p>
                      </div>
                    </div>
                    <p className="shrink-0 text-body-sm text-zinc-400">{formatDate(review.created_at)}</p>
                  </div>
                  <div className="mt-md">
                    <StarRating rating={review.rating} />
                  </div>
                  <p className="mt-sm text-body-sm leading-relaxed text-zinc-400">
                    {review.comment ?? "No comment."}
                  </p>
                </article>
              ))
            ) : (
              <EmptyState
                message="Reviews will appear after students complete sessions and leave feedback."
                title="No reviews yet"
              />
            )}
          </section>
        </div>
      </div>
    </>
  );
}
