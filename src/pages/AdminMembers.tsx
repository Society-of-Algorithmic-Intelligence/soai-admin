import { useEffect, useMemo, useState, Fragment } from 'react';
import { fetchMembers, deleteMember, updateMember, createMember } from '../lib/api';
import type { Member } from '../types';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '../components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table';
import { Pagination, PaginationContent, PaginationItem, PaginationPrevious, PaginationNext } from '../components/ui/pagination';
import { Badge } from '../components/ui/badge';
import { Pencil, UserPlus, RefreshCw, Download } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { unMemberCountries } from '../data/countries';

function useMembers() {
  const [items, setItems] = useState<Member[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string | undefined>();
  const [plan, setPlan] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetchMembers({ page, pageSize, search, status, plan });
      setItems(r.items);
      setTotal(r.total);
    } catch (e: any) {
      setError(e?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, search, status, plan]);

  function updateItemLocal(id: string, changes: Partial<Member>) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...changes } : it)));
  }

  return { items, total, page, pageSize, setPage, search, setSearch, status, setStatus, plan, setPlan, loading, error, reload: load, updateItemLocal };
}

function exportCsv(rows: Member[]) {
  const headers = ['member_id','email','first_name','last_name','status','plan','role','is_admin','personal_webpage','phone','phone_country_code','country','country_code','affiliation','title','renew_date','created_at'];
  const lines = [headers.join(',')].concat(rows.map((m) =>
    headers.map((h) => `"${String((m as any)[h] ?? '').replaceAll('"', '""')}"`).join(',')
  ));
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'members.csv'; a.click();
  URL.revokeObjectURL(url);
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'ACTIVE')
    return <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">Active</Badge>;
  if (status === 'INACTIVE')
    return <Badge variant="outline" className="text-gray-500">Inactive</Badge>;
  return <Badge variant="destructive">Banned</Badge>;
}

export default function AdminMembers() {
  const s = useMembers();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [addEmail, setAddEmail] = useState('');
  const [addFirstName, setAddFirstName] = useState('');
  const [addMiddleName, setAddMiddleName] = useState('');
  const [addLastName, setAddLastName] = useState('');
  const [addCountry, setAddCountry] = useState('');
  const [addAffiliation, setAddAffiliation] = useState('');
  const [addTitle, setAddTitle] = useState('Prof.');
  const [addPlan, setAddPlan] = useState('Regular Member');
  const [addRole, setAddRole] = useState('member');
  const [addIsAdmin, setAddIsAdmin] = useState(false);
  const [addPersonalWebpage, setAddPersonalWebpage] = useState('');
  const [addSendWelcome, setAddSendWelcome] = useState(false);
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const statusOptions = useMemo(() => ['ACTIVE', 'INACTIVE', 'BANNED'], []);
  const planOptions = useMemo(() => ['Regular Member', 'Permanent Member', 'Developing Countries', 'Student Member'], []);
  const ALL = '__all__';
  const countryOptions = useMemo(() => [...unMemberCountries, 'Other'], []);

  async function onCreateMember(e: React.FormEvent) {
    e.preventDefault();
    setAddError(null);
    if (!addEmail.trim() || !addFirstName.trim() || !addLastName.trim() || !addCountry.trim() || !addAffiliation.trim() || !addTitle.trim()) {
      setAddError('Email, first/last name, country/region, affiliation, and title are required.');
      return;
    }
    setAddSubmitting(true);
    try {
      await createMember({
        email: addEmail.trim(), first_name: addFirstName.trim(), last_name: addLastName.trim(),
        middle_name: addMiddleName.trim() || undefined, country: addCountry.trim(),
        affiliation: addAffiliation.trim(), title: addTitle.trim(), plan: addPlan,
        role: addRole.trim() || 'member', is_admin: addIsAdmin,
        personal_webpage: addPersonalWebpage.trim() || undefined, send_welcome: addSendWelcome,
      });
      setAdding(false);
      setAddEmail(''); setAddFirstName(''); setAddMiddleName(''); setAddLastName('');
      setAddCountry(''); setAddAffiliation(''); setAddTitle('Prof.'); setAddPlan('Regular Member');
      setAddRole('member'); setAddIsAdmin(false); setAddPersonalWebpage(''); setAddSendWelcome(false);
      s.reload();
    } catch (err: any) {
      setAddError(err?.message || 'Failed to create member.');
    } finally {
      setAddSubmitting(false);
    }
  }

  const pages = Math.max(1, Math.ceil(s.total / s.pageSize));

  return (
    <div className="p-6 md:p-8 max-w-7xl">

      {/* Page header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Members</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage SoAI membership records, plans, and access levels.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => s.reload()} className="gap-1.5">
            <RefreshCw className="size-3.5" /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportCsv(s.items)} className="gap-1.5">
            <Download className="size-3.5" /> Export CSV
          </Button>
          <Button size="sm" onClick={() => setAdding((v) => !v)} className="gap-1.5">
            <UserPlus className="size-3.5" />
            {adding ? 'Cancel' : 'Add Member'}
          </Button>
        </div>
      </div>

      {/* Add member form */}
      {adding && (
        <Card className="mb-6 border-[#003d7b]/20 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Add Member Manually</CardTitle>
            <CardDescription>Use this when you need to add advisors or members yourself.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onCreateMember} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Email *</label>
                <Input type="email" value={addEmail} onChange={(e) => setAddEmail(e.target.value)} required />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Title *</label>
                <Input value={addTitle} onChange={(e) => setAddTitle(e.target.value)} placeholder="Prof., Dr., Mr., Ms." required />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">First name *</label>
                <Input value={addFirstName} onChange={(e) => setAddFirstName(e.target.value)} required />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Middle name</label>
                <Input value={addMiddleName} onChange={(e) => setAddMiddleName(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Last name *</label>
                <Input value={addLastName} onChange={(e) => setAddLastName(e.target.value)} required />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Country/Region *</label>
                <Select value={addCountry} onValueChange={setAddCountry}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select country/region" /></SelectTrigger>
                  <SelectContent>
                    {countryOptions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Affiliation *</label>
                <Input value={addAffiliation} onChange={(e) => setAddAffiliation(e.target.value)} placeholder="University / Company" required />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Personal webpage</label>
                <Input value={addPersonalWebpage} onChange={(e) => setAddPersonalWebpage(e.target.value)} placeholder="https://example.com (optional)" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Plan *</label>
                <Select value={addPlan} onValueChange={setAddPlan}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {planOptions.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
                <Input value={addRole} onChange={(e) => setAddRole(e.target.value)} placeholder="member, advisor, admin…" />
              </div>
              <div className="flex items-center gap-2">
                <input id="add-is-admin" type="checkbox" className="h-4 w-4 accent-[#003d7b]" checked={addIsAdmin} onChange={(e) => setAddIsAdmin(e.target.checked)} />
                <label htmlFor="add-is-admin" className="text-sm text-gray-700">Grant admin access</label>
              </div>
              <div className="flex items-center gap-2">
                <input id="add-send-welcome" type="checkbox" className="h-4 w-4 accent-[#003d7b]" checked={addSendWelcome} onChange={(e) => setAddSendWelcome(e.target.checked)} />
                <label htmlFor="add-send-welcome" className="text-sm text-gray-700">Send welcome email</label>
              </div>
              {addError && <div className="md:col-span-2 text-sm text-red-600">{addError}</div>}
              <div className="md:col-span-2 flex justify-end">
                <Button type="submit" disabled={addSubmitting}>
                  {addSubmitting ? 'Creating…' : 'Create Member'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Input
          placeholder="Search by ID, name, email, country, affiliation…"
          className="max-w-xs bg-white"
          value={s.search}
          onChange={(e) => { s.setPage(1); s.setSearch(e.target.value); }}
        />
        <Select value={s.status ?? ALL} onValueChange={(v) => { s.setPage(1); s.setStatus(v === ALL ? undefined : v); }}>
          <SelectTrigger className="w-36 bg-white"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {statusOptions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={s.plan ?? ALL} onValueChange={(v) => { s.setPage(1); s.setPlan(v === ALL ? undefined : v); }}>
          <SelectTrigger className="w-44 bg-white"><SelectValue placeholder="All plans" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All plans</SelectItem>
            {planOptions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {s.error && <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{s.error}</div>}

      {/* Table */}
      <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50 border-b">
              <TableHead className="font-semibold text-gray-700">Member ID</TableHead>
              <TableHead className="font-semibold text-gray-700">Name</TableHead>
              <TableHead className="font-semibold text-gray-700">Plan</TableHead>
              <TableHead className="font-semibold text-gray-700">Email</TableHead>
              <TableHead className="font-semibold text-gray-700">Country/Region</TableHead>
              <TableHead className="font-semibold text-gray-700">Status</TableHead>
              <TableHead className="font-semibold text-gray-700">Role</TableHead>
              <TableHead className="font-semibold text-gray-700">Admin</TableHead>
              <TableHead className="font-semibold text-gray-700">Created</TableHead>
              <TableHead className="text-right font-semibold text-gray-700">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {s.loading && (
              <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
            )}
            {!s.loading && s.items.length === 0 && (
              <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">No members found.</TableCell></TableRow>
            )}
            {!s.loading && s.items.map((m) => (
              <Fragment key={m.id}>
                <TableRow className="hover:bg-slate-50 transition-colors">
                  <TableCell className="font-mono text-xs text-gray-500">{m.member_id}</TableCell>
                  <TableCell className="font-medium">
                    {m.first_name} {m.middle_name ? m.middle_name + ' ' : ''}{m.last_name}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={planOptions.includes(m.plan) ? m.plan : undefined}
                      onValueChange={async (v) => {
                        if (v !== m.plan) { await updateMember(m.id, { plan: v }); s.updateItemLocal(m.id, { plan: v }); }
                      }}
                    >
                      <SelectTrigger className="w-[11rem] h-7 text-xs"><SelectValue placeholder="Set plan" /></SelectTrigger>
                      <SelectContent>
                        {planOptions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-sm">{m.email}</TableCell>
                  <TableCell className="text-sm">{m.country}{m.country_code ? ` (${m.country_code})` : ''}</TableCell>
                  <TableCell><StatusBadge status={m.status} /></TableCell>
                  <TableCell className="text-sm">
                    <div className="flex items-center gap-1">
                      <span>{m.role}</span>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-gray-400 hover:text-gray-700"
                        onClick={async () => {
                          const role = prompt('Set role (e.g. member, admin, advisor):', m.role);
                          if (role && role !== m.role) { await updateMember(m.id, { role }); s.updateItemLocal(m.id, { role }); }
                        }}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={m.is_admin ? '1' : '0'}
                      onValueChange={async (v) => {
                        const next = v === '1';
                        if (next !== Boolean(m.is_admin)) {
                          await updateMember(m.id, { is_admin: next, role: m.role });
                          s.updateItemLocal(m.id, { is_admin: next ? 1 : 0 });
                        }
                      }}
                    >
                      <SelectTrigger className="w-16 h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">No</SelectItem>
                        <SelectItem value="1">Yes</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-xs text-gray-500">{new Date(m.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1.5">
                      <Button variant="outline" size="sm" className="h-7 text-xs"
                        onClick={() => setExpandedId(expandedId === m.id ? null : m.id)}
                      >
                        {expandedId === m.id ? 'Hide' : 'Details'}
                      </Button>
                      <Button variant="destructive" size="sm" className="h-7 text-xs"
                        onClick={async () => {
                          if (!confirm(`Remove member ${m.member_id}? This cannot be undone.`)) return;
                          await deleteMember(m.id); s.reload();
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>

                {expandedId === m.id && (
                  <TableRow key={m.id + '-details'}>
                    <TableCell colSpan={10} className="bg-slate-50 border-t border-b p-0">
                      <div className="px-6 py-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-2 text-sm">
                        {[
                          ['Internal ID', <span className="font-mono text-xs">{m.id}</span>],
                          ['Member ID', <span className="font-mono">{m.member_id}</span>],
                          ['Email', m.email],
                          ['Title', m.title || '—'],
                          ['First name', m.first_name],
                          ['Middle name', m.middle_name || '—'],
                          ['Last name', m.last_name],
                          ['Affiliation', m.affiliation || '—'],
                          ['Country', `${m.country || '—'}${m.country_code ? ` (${m.country_code})` : ''}`],
                          ['Status', m.status],
                          ['Plan', m.plan],
                          ['Role', m.role],
                          ['Admin', m.is_admin ? 'Yes' : 'No'],
                          ['Renew date', m.renew_date || '—'],
                          ['Created', new Date(m.created_at).toLocaleString()],
                          ['Webpage', m.personal_webpage ? (
                            <a className="text-[#003d7b] underline underline-offset-2 text-xs" href={m.personal_webpage} target="_blank" rel="noreferrer">
                              {m.personal_webpage}
                            </a>
                          ) : '—'],
                        ].map(([label, value]) => (
                          <div key={String(label)}>
                            <div className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-0.5">{label}</div>
                            <div className="text-gray-800">{value as React.ReactNode}</div>
                          </div>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          Page {s.page} of {pages} · {s.total} total members
        </span>
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                className={s.page <= 1 ? 'pointer-events-none opacity-40' : ''}
                onClick={s.page > 1 ? () => s.setPage(s.page - 1) : undefined}
              />
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                className={s.page >= pages ? 'pointer-events-none opacity-40' : ''}
                onClick={s.page < pages ? () => s.setPage(s.page + 1) : undefined}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
}
