import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Star } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { getAdminReviews, hideReview, showReview } from "@/services/admin.service";
import type { AdminReview } from "@/types/admin";

function date(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value));
}

export function AdminReviewsPage() {
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [actionId, setActionId] = useState<number | null>(null);

  async function loadReviews() {
    try {
      setReviews(await getAdminReviews({ limit: 50 }));
      setError("");
    } catch {
      setError("Could not load reviews. Admin access is required.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadReviews();
  }, []);

  async function runReviewAction(reviewId: number, successText: string, action: () => Promise<unknown>) {
    setActionId(reviewId);
    setError("");
    setMessage("");
    try {
      await action();
      setMessage(successText);
      await loadReviews();
    } catch (caughtError) {
      setError((caughtError as { response?: { data?: { detail?: string } } }).response?.data?.detail ?? "Review action failed.");
    } finally {
      setActionId(null);
    }
  }

  return (
    <Page title="Reviews" description="Manage review visibility." error={error} message={message} loading={loading} empty={!reviews.length}>
      <section className="grid gap-md">
        {reviews.map((review) => (
          <article className="rounded-lg border border-[#27272A] bg-[#18181B] p-lg" key={review.id}>
            <div className="flex flex-col gap-sm sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-body-md font-medium text-zinc-100">{review.student_name ?? "Student"} to {review.instructor_name ?? "Instructor"}</p>
                <p className="mt-xs text-body-sm capitalize text-zinc-400">{review.status} - {date(review.created_at)}</p>
              </div>
              <div className="flex flex-wrap items-center gap-sm">
                <div className="flex gap-xs text-tertiary">{[1, 2, 3, 4, 5].map((rating) => <Star className={rating <= review.rating ? "size-4 fill-current" : "size-4"} key={rating} />)}</div>
                {review.status === "hidden" ? (
                  <button className="inline-flex h-8 items-center rounded-md border border-secondary/40 px-sm text-label-md text-secondary transition hover:bg-secondary/10 disabled:opacity-50" disabled={actionId !== null} onClick={() => { if (window.confirm("Show this review again?")) void runReviewAction(review.id, "Review shown.", () => showReview(review.id)); }} type="button">
                    Show
                  </button>
                ) : (
                  <button className="inline-flex h-8 items-center rounded-md bg-error/10 px-sm text-label-md text-error ring-1 ring-error/25 disabled:opacity-50" disabled={actionId !== null} onClick={() => { if (window.confirm("Hide this review from public rating?")) void runReviewAction(review.id, "Review hidden.", () => hideReview(review.id)); }} type="button">
                    Hide
                  </button>
                )}
              </div>
            </div>
            <p className="mt-md text-body-sm text-zinc-400">{review.comment ?? "No comment."}</p>
          </article>
        ))}
      </section>
    </Page>
  );
}

function Page({ title, description, error, message, loading, empty, children }: { title: string; description: string; error: string; message: string; loading: boolean; empty: boolean; children: ReactNode }) {
  return <><header className="sticky top-0 z-[60] bg-[#09090B]/95 backdrop-blur-xl border-b border-[#27272A] px-margin-mobile py-lg md:px-margin-desktop"><h1 className="text-headline-lg text-zinc-100">{title}</h1><p className="mt-xs text-body-sm text-zinc-400">{description}</p></header><div className="space-y-lg px-margin-mobile py-lg md:px-margin-desktop">{message ? <p className="rounded-md border border-secondary/25 bg-secondary/10 px-md py-sm text-body-sm text-secondary">{message}</p> : null}{error ? <ErrorState message={error} /> : null}{loading ? <LoadingState message={`Loading ${title.toLowerCase()}...`} /> : null}{children}{!loading && empty ? <EmptyState title={`No ${title.toLowerCase()} found`} message="Real platform data will appear here when available." /> : null}</div></>;
}
