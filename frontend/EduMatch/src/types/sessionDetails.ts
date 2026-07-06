import type { PaymentStatus } from "@/components/ui/PaymentStatusBadge";
import type { SessionStatus } from "@/components/ui/SessionStatusBadge";

export type SessionMode = "Individual" | "Group";
export type SessionType = "Online" | "Offline";

export type SessionDetailsData = {
  id: string;
  subject: string;
  instructorName: string;
  instructorRole: string;
  instructorSpecialization: string;
  instructorRating: number;
  instructorReviews: number;
  requestTitle: string;
  requestType: string | null;
  sessionType: SessionType;
  sessionMode: SessionMode;
  status: SessionStatus;
  paymentStatus: PaymentStatus;
  date: string;
  time: string;
  duration: string;
  platform: string;
  meetingLink: string;
  price: string;
  platformFee: string;
  totalPaid: string;
  escrowStatus: string;
  description: string;
};
