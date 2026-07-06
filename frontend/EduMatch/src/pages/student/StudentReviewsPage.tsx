import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { getMyReviews } from "@/services/reviews.service";
import type { Review } from "@/types/review";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value));
}

export function StudentReviewsPage() {
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

  return (
    <>
      <header className="sticky top-0 z-[60] bg-[#09090B]/95 backdrop-blur-xl border-b border-[#27272A] px-margin-mobile py-lg md:px-margin-desktop">
        <h1 className="text-headline-lg text-zinc-100">My Reviews</h1>
        <p className="mt-xs max-w-2xl text-body-sm text-zinc-400">
          Reviews you submitted after completed sessions.
        </p>
      </header>

      <div className="space-y-md px-margin-mobile py-lg md:px-margin-desktop">
        {error ? <p className="rounded-md border border-error/25 bg-error/10 px-md py-sm text-body-sm text-error">{error}</p> : null}
        {loading ? (
          <p className="rounded-md border border-[#27272A] bg-[#18181B] p-md text-body-sm text-zinc-400">
            Loading reviews...
          </p>
        ) : reviews.length > 0 ? (
          reviews.map((review) => (
            <article className="rounded-lg border border-[#27272A] bg-[#18181B] p-lg" key={review.id}>
              <div className="flex flex-col gap-md sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-label-md uppercase text-secondary">{review.session_title ?? "Learning Session"}</p>
                  <h2 className="mt-xs text-headline-md text-zinc-100">{review.instructor_name ?? "Instructor"}</h2>
                  <p className="mt-xs text-body-sm text-zinc-400">{formatDate(review.created_at)}</p>
                </div>
                <div className="flex gap-xs text-tertiary">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <Star className={rating <= review.rating ? "size-5 fill-tertiary" : "size-5"} key={rating} />
                  ))}
                </div>
              </div>
              <p className="mt-md text-body-sm leading-relaxed text-zinc-400">{review.comment ?? "No comment."}</p>
            </article>
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-[#27272A] bg-[#121214] p-xl text-center">
            <h2 className="text-headline-md text-zinc-100">No reviews yet</h2>
            <p className="mt-sm text-body-sm text-zinc-400">
              Complete a session to leave your first review.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
