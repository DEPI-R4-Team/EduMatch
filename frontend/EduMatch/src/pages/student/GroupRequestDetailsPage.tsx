import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";
import { Check, MessageSquareText, WalletCards, X } from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { RequestStatusBadge } from "@/components/ui/RequestStatusBadge";
import { useAuth } from "@/hooks/useAuth";
import { acceptApplication, getApplicationsForRequest, rejectApplication } from "@/services/applications.service";
import {
  getGroupRequestById,
  joinGroupRequest,
  leaveGroupRequest,
  payGroupRequest,
} from "@/services/groupRequests.service";
import { devConfirmPayment, getPaymentStatus, redirectToPaymobCheckout } from "@/services/payments.service";
import type { GroupRequest } from "@/types/groupRequest";

function money(value: string | null) {
  return value ? `${value} EGP` : "Not set";
}

function parseApiError(error: unknown) {
  if (axios.isAxiosError(error)) {
    if (!error.response) return "Cannot connect to server. Make sure the backend is running.";
    const detail = (error.response.data as { detail?: unknown })?.detail;
    if (typeof detail === "string") return detail;
  }
  return "Action failed. Please try again.";
}

export function GroupRequestDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [group, setGroup] = useState<GroupRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [pollingPaymentId, setPollingPaymentId] = useState<number | null>(null);

  const loadGroup = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const groupId = Number.parseInt(id, 10);
      const data = await getGroupRequestById(groupId);
      if (user?.id === data.group_owner_id) {
        try {
          data.applications = await getApplicationsForRequest(groupId);
        } catch {
          data.applications = [];
        }
      }
      setGroup(data);
      setError("");
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setLoading(false);
    }
  }, [id, user?.id]);

  useEffect(() => {
    if (!pollingPaymentId) return;

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 60; // 60 x 2s = 120s max polling

    const poll = async () => {
      while (!cancelled && attempts < maxAttempts) {
        attempts++;
        try {
          const updated = await getPaymentStatus(pollingPaymentId);
          if (updated.status !== "pending") {
            setPollingPaymentId(null);
            setActionLoading(false);
            setNotice("Payment verified successfully.");
            await loadGroup();
            return;
          }
        } catch {
          // ignore polling errors
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
      
      if (!cancelled && attempts >= maxAttempts) {
        setPollingPaymentId(null);
        setActionLoading(false);
        setNotice("Stopped waiting for payment. Please refresh if you completed it.");
      }
    };

    void poll();

    return () => {
      cancelled = true;
    };
  }, [pollingPaymentId, loadGroup]);

  useEffect(() => {
    void loadGroup();
  }, [loadGroup]);

  async function runAction(action: () => Promise<unknown>, success: string) {
    setActionLoading(true);
    setNotice("");
    try {
      const result = await action();
      // Handle Paymob checkout redirect
      if (result && typeof result === "object" && "checkout_url" in result) {
        const paymentResult = result as { checkout_url: string; client_secret: string; payment_id: number };
        redirectToPaymobCheckout(paymentResult);
        setNotice("Redirecting to Paymob...");
        setPollingPaymentId(paymentResult.payment_id);
        return; // actionLoading remains true while polling
      }
      setNotice(success);
      await loadGroup();
      setActionLoading(false);
    } catch (err) {
      setNotice(parseApiError(err));
      setActionLoading(false);
    }
  }

  if (loading) {
    return <main className="px-margin-mobile py-lg md:px-margin-desktop"><LoadingState message="Loading group request..." /></main>;
  }

  if (!group) {
    return <main className="px-margin-mobile py-lg md:px-margin-desktop">{error ? <ErrorState message={error} /> : <EmptyState title="Group not found" message="This group request is not available." />}</main>;
  }

  const participant = group.current_user_participant;
  const isOwner = user?.id === group.group_owner_id;
  const isParticipant = Boolean(participant);
  const isPaid = participant?.payment_status === "held" || participant?.payment_status === "released";
  const canPay = isParticipant && group.status === "waiting_payment" && participant?.payment_status === "unpaid";
  const payableAmount = group.final_price_per_student ?? group.current_price_per_student;

  return (
    <>
      <header className="sticky top-0 z-[60] bg-[#09090B]/95 backdrop-blur-xl border-b border-[#27272A] px-margin-mobile py-lg md:px-margin-desktop">
        <BackButton className="mb-md" fallback="/student/group-requests" />
        <div className="flex flex-col gap-md lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-headline-lg text-zinc-100">{group.title}</h1>
            <p className="mt-xs text-body-sm text-zinc-400">{group.subject} · owner {group.owner_name ?? "Student"}</p>
          </div>
          <RequestStatusBadge status={group.status as never} />
        </div>
      </header>

      <main className="grid gap-lg px-margin-mobile py-lg md:px-margin-desktop xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-lg">
          {error ? <ErrorState message={error} /> : null}
          {notice ? <p className="rounded-md border border-secondary/25 bg-secondary/10 px-md py-sm text-body-sm text-secondary">{notice}</p> : null}
          {import.meta.env.DEV && pollingPaymentId && (
            <button
              className="inline-flex h-9 items-center justify-center rounded-md bg-secondary px-sm text-body-sm font-medium text-on-secondary hover:bg-secondary/90"
              onClick={async () => {
                try {
                  const confirmed = await devConfirmPayment(pollingPaymentId);
                  if (confirmed.status === "held" || confirmed.status === "released") {
                    setPollingPaymentId(null);
                    setActionLoading(false);
                    setNotice("Payment verified successfully via Dev Mode.");
                    await loadGroup();
                  }
                } catch (err) {
                  console.error("Dev confirm failed", err);
                }
              }}
              type="button"
            >
              Dev: Simulate Webhook Success
            </button>
          )}

          <article className="rounded-lg border border-[#27272A] bg-[#18181B] p-lg">
            <h2 className="text-headline-md text-zinc-100">Group Details</h2>
            <p className="mt-md text-body-sm leading-relaxed text-zinc-400">{group.description}</p>
            <div className="mt-lg grid gap-md sm:grid-cols-2">
              <Info label="Participants" value={`${group.active_participants_count}/${group.max_participants ?? "-"}`} />
              <Info label={group.price_locked ? "Locked Price" : "Current Price"} value={money(payableAmount)} />
              <Info label="If You Join" value={money(group.price_if_you_join)} />
              <Info label="Minimum Price" value={money(group.min_price_per_student)} />
              <Info label="Payment Progress" value={`${group.paid_participants_count}/${group.total_required_participants} paid`} />
              <Info label="Accepted Instructor" value={group.accepted_instructor_name ?? "Not accepted yet"} />
              <Info label="Your Payment" value={group.current_user_payment_status ?? participant?.payment_status ?? "Not joined"} />
            </div>
          </article>

          <article className="rounded-lg border border-[#27272A] bg-[#18181B] p-lg">
            <h2 className="text-headline-md text-zinc-100">Participants</h2>
            <div className="mt-md divide-y divide-outline-variant">
              {group.participants.map((item) => (
                <div className="flex items-center justify-between gap-md py-sm" key={item.id}>
                  <span className="text-body-sm text-zinc-100">{item.student_name ?? "Student"}</span>
                  <span className="rounded-full bg-[#27272A] px-sm py-xs text-label-md uppercase text-zinc-400">{item.payment_status}</span>
                </div>
              ))}
            </div>
          </article>

          {isOwner ? (
            <article className="rounded-lg border border-[#27272A] bg-[#18181B] p-lg">
              <h2 className="text-headline-md text-zinc-100">Instructor Applications</h2>
              {group.applications.length === 0 ? (
                <p className="mt-md text-body-sm text-zinc-400">No instructor applications yet.</p>
              ) : (
                <div className="mt-md space-y-md">
                  {group.applications.map((application) => (
                    <div className="rounded-md border border-[#27272A] bg-[#121214] p-md" key={application.id}>
                      <div className="flex flex-col gap-sm md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="text-body-md font-medium text-zinc-100">{application.instructor_name ?? "Instructor"}</p>
                          <p className="mt-xs text-body-sm text-zinc-400">{application.message}</p>
                          <p className="mt-xs text-body-sm text-zinc-400">Proposed price: {application.proposed_price} EGP · {application.status}</p>
                        </div>
                        {application.status === "pending" && group.status === "open" ? (
                          <div className="flex gap-xs">
                            <button className="inline-flex h-9 items-center gap-xs rounded-md bg-primary px-sm text-body-sm text-on-primary disabled:opacity-50" disabled={actionLoading} onClick={() => void runAction(() => acceptApplication(application.id), "Instructor accepted. Participants can now pay.")} type="button">
                              <Check className="size-4" />
                              Accept
                            </button>
                            <button className="inline-flex h-9 items-center gap-xs rounded-md border border-error/30 px-sm text-body-sm text-error disabled:opacity-50" disabled={actionLoading} onClick={() => void runAction(() => rejectApplication(application.id), "Application rejected.")} type="button">
                              <X className="size-4" />
                              Reject
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </article>
          ) : null}
        </section>

        <aside className="space-y-md">
          <section className="rounded-lg border border-[#27272A] bg-[#18181B] p-lg">
            <h2 className="text-headline-md text-zinc-100">Actions</h2>
            <div className="mt-md space-y-sm">
              {!isParticipant ? (
                <button className="h-10 w-full rounded-md bg-primary text-body-sm font-medium text-on-primary hover:bg-primary/90 disabled:opacity-50" disabled={actionLoading || group.status !== "open"} onClick={() => void runAction(() => joinGroupRequest(group.id), "You joined this group request.")} type="button">
                  Join Group
                </button>
              ) : !isOwner && participant?.payment_status === "unpaid" && group.status === "open" ? (
                <button className="h-10 w-full rounded-md border border-error/30 text-body-sm text-error hover:bg-error/10 disabled:opacity-50" disabled={actionLoading} onClick={() => void runAction(() => leaveGroupRequest(group.id), "You left this group request.")} type="button">
                  Leave Group
                </button>
              ) : null}

              {canPay ? (
                <button className="inline-flex h-10 w-full items-center justify-center gap-xs rounded-md bg-secondary text-body-sm font-medium text-on-secondary hover:bg-secondary/90 disabled:opacity-50" disabled={actionLoading} onClick={() => void runAction(() => payGroupRequest(group.id), "Your share is now held in escrow.")} type="button">
                  <WalletCards className="size-4" />
                  Pay My Share via Paymob
                </button>
              ) : null}

              {group.session_id && isPaid ? (
                <Link className="inline-flex h-10 w-full items-center justify-center gap-xs rounded-md border border-secondary/40 text-body-sm text-secondary hover:bg-secondary/10" to="/student/chat">
                  <MessageSquareText className="size-4" />
                  Open Chat
                </Link>
              ) : null}

              <p className="text-body-sm text-zinc-400">
                Session becomes ready after all active participants pay.
              </p>
            </div>
          </section>
        </aside>
      </main>
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[#27272A] bg-[#121214] p-md">
      <p className="text-label-md uppercase text-zinc-400">{label}</p>
      <p className="mt-xs text-body-md text-zinc-100">{value}</p>
    </div>
  );
}
