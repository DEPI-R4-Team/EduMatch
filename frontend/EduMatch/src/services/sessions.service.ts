import { api } from "@/services/api";
import type { Session } from "@/types/session";

export async function getMySessions(): Promise<Session[]> {
  const response = await api.get<Session[]>("/sessions/my");
  return response.data;
}

export async function getSessionById(sessionId: number): Promise<Session> {
  const response = await api.get<Session>(`/sessions/${sessionId}`);
  return response.data;
}

export async function startSession(sessionId: number): Promise<Session> {
  const response = await api.put<Session>(`/sessions/${sessionId}/start`);
  return response.data;
}

export async function instructorCompleteSession(sessionId: number): Promise<Session> {
  const response = await api.put<Session>(`/sessions/${sessionId}/instructor-complete`);
  return response.data;
}

export async function confirmSessionCompletion(sessionId: number): Promise<Session> {
  const response = await api.post<Session>(`/sessions/${sessionId}/confirm-completion`);
  return response.data;
}

export async function cancelSession(sessionId: number): Promise<Session> {
  const response = await api.put<Session>(`/sessions/${sessionId}/cancel`);
  return response.data;
}

export async function rescheduleSession(sessionId: number, scheduledAt: string): Promise<Session> {
  const response = await api.put<Session>(`/sessions/${sessionId}/reschedule`, {
    scheduled_at: scheduledAt,
  });
  return response.data;
}
