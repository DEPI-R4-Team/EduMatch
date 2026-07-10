export interface PaymobCheckoutItem {
  name: string;
  amount: number;
  description?: string;
  quantity?: number;
}

export interface PaymobBillingData {
  first_name: string;
  last_name?: string;
  email: string;
  phone_number?: string;
  apartment?: string;
  floor?: string;
  street?: string;
  building?: string;
  shipping_method?: string;
  postal_code?: string;
  city?: string;
  country?: string;
  state?: string;
}

export interface PaymobCheckoutPayload {
  amount: number;
  currency?: "EGP";
  billing_data: PaymobBillingData;
  items: PaymobCheckoutItem[];
  merchant_order_id?: string;
}

export interface PaymobCheckoutResponse {
  payment_token: string;
  iframe_url: string;
  order_id: number;
  amount_cents: number;
  currency: string;
}
