export type SessionStatus = "waiting_payment" | "ready" | "active" | "completed" | "cancelled" | "disputed";

export interface Session {
  id: number;
  request_id: number;
  student_id: number;
  instructor_id: number;
  session_mode: string;
  session_type: string;
  scheduled_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  instructor_marked_completed_at: string | null;
  student_confirmed_completed_at: string | null;
  completed_at: string | null;
  status: SessionStatus;
  created_at: string;
  updated_at: string;
  request_title: string | null;
  request_type: string | null;
  request_status: string | null;
  payment_status: string | null;
  payment_amount: string | null;
  payment_platform_fee: string | null;
  payment_total_amount: string | null;
  student_name: string | null;
  instructor_name: string | null;
  has_review: boolean;
}
