import { api } from "@/services/api";
import type {
  GroupParticipant,
  GroupPaymentResponse,
  GroupPricePreview,
  GroupRequest,
  GroupRequestCreatePayload,
} from "@/types/groupRequest";
import type { PaymentIntentionResponse } from "@/types/payment";

export async function createGroupRequest(data: GroupRequestCreatePayload): Promise<GroupRequest> {
  const response = await api.post<GroupRequest>("/group-requests", data);
  return response.data;
}

export async function getGroupRequests(params?: { search?: string; subject?: string; status?: string; available_only?: boolean }): Promise<GroupRequest[]> {
  const response = await api.get<GroupRequest[]>("/group-requests", { params });
  return response.data;
}

export async function getMyGroupRequests(): Promise<GroupRequest[]> {
  const response = await api.get<GroupRequest[]>("/group-requests/my");
  return response.data;
}

export async function getGroupRequestById(id: number): Promise<GroupRequest> {
  const response = await api.get<GroupRequest>(`/group-requests/${id}`);
  return response.data;
}

export async function joinGroupRequest(id: number): Promise<GroupRequest> {
  const response = await api.post<{ group_request: GroupRequest }>(`/group-requests/${id}/join`);
  return response.data.group_request;
}

export async function leaveGroupRequest(id: number): Promise<GroupRequest> {
  const response = await api.post<GroupRequest>(`/group-requests/${id}/leave`);
  return response.data;
}

export async function getGroupParticipants(id: number): Promise<GroupParticipant[]> {
  const response = await api.get<GroupParticipant[]>(`/group-requests/${id}/participants`);
  return response.data;
}

export async function getGroupPricePreview(id: number): Promise<GroupPricePreview> {
  const response = await api.get<GroupPricePreview>(`/group-requests/${id}/price-preview`);
  return response.data;
}

export async function payGroupRequest(id: number): Promise<GroupPaymentResponse | PaymentIntentionResponse> {
  const response = await api.post<GroupPaymentResponse | PaymentIntentionResponse>(`/group-requests/${id}/pay`, { payment_method: "paymob_card" });
  return response.data;
}
