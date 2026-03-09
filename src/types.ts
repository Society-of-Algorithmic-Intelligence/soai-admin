export interface Member {
  id: string;
  member_id: string;
  email: string;
  first_name: string;
  last_name: string;
  middle_name?: string | null;
  status: string; // ACTIVE | INACTIVE | BANNED
  plan: string; // permanent | monthly | yearly | ...
  role: string; // member | admin | ...
  is_admin: 0 | 1; // boolean-like from D1 (0=false, 1=true)
  personal_webpage?: string | null;
  phone?: string | null;
  phone_country_code?: string | null;
  country?: string | null;
  country_code?: string | null;
  affiliation?: string | null;
  title?: string | null;
  renew_date?: string | null;
  created_at: string;
}

export interface MembersQuery {
  page: number;
  pageSize: number;
  search?: string;
  status?: string;
  plan?: string;
}

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface EventRegistrationEventSummary {
  event: string;
  total: number;
  paid: number;
  last_paid_at: string | null;
}

export interface EventRegistrationParticipant {
  id: string;
  event: string;
  stripe_session_id: string;
  stripe_payment_intent_id?: string | null;
  email?: string | null;
  full_name?: string | null;
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  title?: string | null;
  affiliation?: string | null;
  country?: string | null;
  personal_webpage?: string | null;
  membership_status?: string | null; // for ISI: stores the ISI member id
  tier?: string | null;
  member?: string | null;
  amount_total?: number | null;
  currency?: string | null;
  payment_status?: string | null;
  paid_at?: string | null;
  created_at: string;
}


