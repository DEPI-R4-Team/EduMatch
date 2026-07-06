import type { Application } from "@/types/application";
import type { Payment } from "@/types/payment";

export type GroupParticipant = {
  id: number;
  request_id: number;
  student_id: number;
  student_name: string | null;
  status: "active" | "left" | "removed" | string;
  payment_status: "unpaid" | "held" | "released" | "refunded" | string;
  payment_id: number | null;
  joined_at: string;
};

export type GroupRequest = {
  id: number;
  student_id: number;
  group_owner_id: number | null;
  owner_name: string | null;
  title: string;
  subject: string;
  description: string;
  level: string | null;
  request_type: string;
  session_mode: string;
  session_type: string;
  preferred_datetime: string | null;
  base_price: string | null;
  min_price_per_student: string | null;
  current_price_per_student: string | null;
  final_price_per_student: string | null;
  price_locked: boolean;
  max_participants: number | null;
  min_participants: number | null;
  active_participants_count: number;
  price_if_you_join: string | null;
  paid_participants_count: number;
  total_required_participants: number;
  fully_funded: boolean;
  current_user_payment_status: string | null;
  status: string;
  accepted_instructor_id: number | null;
  accepted_instructor_name: string | null;
  session_id: number | null;
  current_user_participant: GroupParticipant | null;
  participants: GroupParticipant[];
  applications: Application[];
  created_at: string;
  updated_at: string;
};

export type GroupRequestCreatePayload = {
  title: string;
  subject: string;
  description: string;
  level?: string;
  session_type?: string;
  preferred_datetime?: string;
  base_price: number;
  min_price_per_student: number;
  max_participants: number;
  min_participants?: number;
};

export type GroupPricePreview = {
  base_price: string | null;
  min_price_per_student: string | null;
  active_participants_count: number;
  max_participants: number | null;
  current_price_per_student: string | null;
  final_price_per_student: string | null;
  price_locked: boolean;
  price_if_you_join: string | null;
  paid_participants_count: number;
  total_required_participants: number;
  fully_funded: boolean;
};

export type GroupPaymentResponse = {
  payment: Payment;
  group_request: GroupRequest;
};
