import type { Member, MembersQuery, PagedResult } from '../types';

const DEFAULT_API_BASE = import.meta.env.VITE_API_BASE || '';

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${DEFAULT_API_BASE}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

export async function fetchMembers(
  query: MembersQuery
): Promise<PagedResult<Member>> {
  const qs = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize),
    ...(query.search ? { search: query.search } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.plan ? { plan: query.plan } : {}),
  }).toString();
  return await http<PagedResult<Member>>(`/api/members?${qs}`);
}

export async function deleteMember(id: string): Promise<{ ok: boolean }> {
  return await http<{ ok: boolean }>(`/api/members?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export async function updateMember(
  id: string,
  changes: { role?: string; plan?: string }
): Promise<{ ok: boolean }> {
  return await http<{ ok: boolean }>(`/api/members`, {
    method: 'PATCH',
    body: JSON.stringify({ id, ...changes }),
  });
}


