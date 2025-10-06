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


