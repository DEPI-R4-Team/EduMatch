import type { SessionStatus } from "@/types/session";

export const RESCHEDULABLE_NORMAL_SESSION_STATUSES: SessionStatus[] = ["waiting_payment", "ready"];

export function canRescheduleNormalSession(session: { request_type: string | null; status: string }) {
  return (
    session.request_type === "normal" &&
    RESCHEDULABLE_NORMAL_SESSION_STATUSES.includes(session.status as SessionStatus)
  );
}
