import { useEffect, useMemo, useState, Fragment } from 'react';
import { fetchMembers, deleteMember, updateMember } from '../lib/api';
import type { Member } from '../types';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '../components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table';
import { Pagination, PaginationContent, PaginationItem, PaginationPrevious, PaginationNext } from '../components/ui/pagination';
import { Badge } from '../components/ui/badge';
import { Pencil } from 'lucide-react';

function useMembers() {
  const [items, setItems] = useState<Member[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
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

  return {
    items,
    total,
    page,
    pageSize,
    setPage,
    setPageSize,
    search,
    setSearch,
    status,
    setStatus,
    plan,
    setPlan,
    loading,
    error,
    reload: load,
    updateItemLocal,
  };
}

function exportCsv(rows: Member[]) {
  const headers = [
    'member_id','email','first_name','last_name','status','plan','role','is_admin','personal_webpage','phone','phone_country_code','country','country_code','affiliation','title','renew_date','created_at'
  ];
  const lines = [headers.join(',')].concat(rows.map((m) => headers.map((h) => {
    const v = (m as any)[h] ?? '';
    const s = String(v).replaceAll('"', '""');
    return `"${s}"`;
  }).join(',')));
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'members.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminMembers() {
  const s = useMembers();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const statusOptions = useMemo(() => ['ACTIVE','INACTIVE','BANNED'], []);
  const planOptions = useMemo(() => ['Regular Member','Permanent Member','Developing Countries','Student Member'], []);
  const ALL = '__all__';

  return (
    <div className="max-w-7xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Members</h1>
        <div className="flex">
          <Button variant="outline" onClick={() => s.reload()}>Refresh</Button>
          <Button variant="outline" onClick={() => exportCsv(s.items)}>Export CSV</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4">
        <Input
          placeholder="Search by id, name, email, country, affiliation"
          className="col-span-2"
          value={s.search}
          onChange={(e) => { s.setPage(1); s.setSearch(e.target.value); }}
        />
        <Select value={s.status ?? ALL} onValueChange={(v) => { s.setPage(1); s.setStatus(v === ALL ? undefined : v); }}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="All status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All status</SelectItem>
            {statusOptions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={s.plan ?? ALL} onValueChange={(v) => { s.setPage(1); s.setPlan(v === ALL ? undefined : v); }}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="All plans" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All plans</SelectItem>
            {planOptions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Country</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Admin</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {s.loading && (
              <TableRow><TableCell colSpan={10}>Loading…</TableCell></TableRow>
            )}
            {!s.loading && s.items.length === 0 && (
              <TableRow><TableCell colSpan={10}>No members found</TableCell></TableRow>
            )}
            {!s.loading && s.items.map((m) => (
              <Fragment key={m.id}>
                <TableRow>
                  <TableCell className="font-mono">{m.member_id}</TableCell>
                  <TableCell>{m.first_name} {m.middle_name ? m.middle_name + ' ' : ''}{m.last_name}</TableCell>
                  <TableCell>
                    <Select
                      value={planOptions.includes(m.plan) ? m.plan : undefined}
                      onValueChange={async (v) => {
                        if (v !== m.plan) {
                          await updateMember(m.id, { plan: v });
                          s.updateItemLocal(m.id, { plan: v });
                        }
                      }}
                    >
                      <SelectTrigger className="w-[12rem] h-8">
                        <SelectValue placeholder="Set plan" />
                      </SelectTrigger>
                      <SelectContent>
                        {planOptions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>{m.email}</TableCell>
                  <TableCell>{m.country} {m.country_code ? `(${m.country_code})` : ''}</TableCell>
                  <TableCell>
                    <Badge variant={m.status === 'ACTIVE' ? 'secondary' : m.status === 'INACTIVE' ? 'outline' : 'destructive'}>{m.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <span>{m.role}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6"
                        aria-label="Edit role"
                        title="Edit role"
                        onClick={async () => {
                          const role = prompt('Set role for this member (e.g., member, admin, editor):', m.role);
                          if (role && role !== m.role) {
                            await updateMember(m.id, { role });
                            s.updateItemLocal(m.id, { role });
                          }
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={m.is_admin ? '1' : '0'}
                      onValueChange={async (v) => {
                        const next = v === '1';
                        if (next !== Boolean(m.is_admin)) {
                          // send role as well for compatibility with older backends
                          await updateMember(m.id, { is_admin: next, role: m.role });
                          s.updateItemLocal(m.id, { is_admin: next ? 1 : 0 });
                        }
                      }}
                    >
                      <SelectTrigger className="w-[8rem] h-8">
                        <SelectValue placeholder="Set admin" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">No</SelectItem>
                        <SelectItem value="1">Yes</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>{new Date(m.created_at).toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end">
                      <Button variant="outline" size="sm" onClick={() => setExpandedId(expandedId === m.id ? null : m.id)}>
                        {expandedId === m.id ? 'Hide' : 'Details'}
                      </Button>
                      <Button variant="destructive" size="sm"
                        onClick={async () => {
                          if (!confirm(`Remove member ${m.member_id}? This cannot be undone.`)) return;
                          await deleteMember(m.id);
                          s.reload();
                        }}
                      >Remove</Button>
                    </div>
                  </TableCell>
                </TableRow>
                {expandedId === m.id && (
                  <TableRow key={m.id + '-details'}>
                    <TableCell colSpan={10}>
                      <div className="bg-muted/20 rounded text-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                        <div><span className="text-muted-foreground">ID:</span> <span className="font-mono">{m.id}</span></div>
                        <div><span className="text-muted-foreground">Member ID:</span> <span className="font-mono">{m.member_id}</span></div>
                        <div><span className="text-muted-foreground">Email:</span> {m.email}</div>
                        <div><span className="text-muted-foreground">First name:</span> {m.first_name}</div>
                        <div><span className="text-muted-foreground">Middle name:</span> {m.middle_name || ''}</div>
                        <div><span className="text-muted-foreground">Last name:</span> {m.last_name}</div>
                        <div><span className="text-muted-foreground">Title:</span> {m.title || ''}</div>
                        <div><span className="text-muted-foreground">Affiliation:</span> {m.affiliation || ''}</div>
                        <div><span className="text-muted-foreground">Country:</span> {m.country} {m.country_code ? `(${m.country_code})` : ''}</div>
                        <div><span className="text-muted-foreground">Personal webpage:</span> {m.personal_webpage ? <a className="underline" href={m.personal_webpage} target="_blank" rel="noreferrer">{m.personal_webpage}</a> : ''}</div>
                        <div><span className="text-muted-foreground">Status:</span> {m.status}</div>
                        <div><span className="text-muted-foreground">Plan:</span> {m.plan}</div>
                        <div><span className="text-muted-foreground">Role:</span> {m.role}</div>
                        <div><span className="text-muted-foreground">Admin:</span> {m.is_admin ? 'Yes' : 'No'}</div>
                        <div><span className="text-muted-foreground">Renew date:</span> {m.renew_date || ''}</div>
                        <div><span className="text-muted-foreground">Created at:</span> {new Date(m.created_at).toLocaleString()}</div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </div>

      {(() => {
        const pages = Math.max(1, Math.ceil(s.total / s.pageSize));
        const canPrev = s.page > 1;
        const canNext = s.page < pages;
        return (
          <div>
            <div className="text-sm text-muted-foreground">Page {s.page} of {pages} · {s.total} total</div>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    className={!canPrev ? 'pointer-events-none opacity-50' : ''}
                    onClick={canPrev ? () => s.setPage(s.page - 1) : undefined}
                  />
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    className={!canNext ? 'pointer-events-none opacity-50' : ''}
                    onClick={canNext ? () => s.setPage(s.page + 1) : undefined}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        );
      })()}
    </div>
  );
}


