import { useEffect, useMemo, useState } from 'react';
import { Button } from '../components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table';
import { fetchEventRegistrationEvents, fetchEventRegistrationParticipants } from '../lib/api';
import type { EventRegistrationEventSummary, EventRegistrationParticipant } from '../types';

function fmtDate(v: string | null | undefined) {
  if (!v) return '';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString();
}

function fmtMoney(amountTotal: number | null | undefined, currency: string | null | undefined) {
  if (amountTotal == null) return '';
  const c = (currency || 'SGD').toUpperCase();
  return `${c} ${(amountTotal / 100).toFixed(2)}`;
}

function membershipLabel(v: string | null | undefined) {
  const s = String(v || '').trim();
  if (!s) return '';
  if (s === 'existing') return 'SoAI member (existing)';
  if (s === 'join') return 'SoAI member (joined at checkout)';
  if (s === 'nonmember') return 'Non-member';
  // For ISI: we store the ISI member id directly in membership_status
  return `ISI (${s})`;
}

function exportParticipantsCsv(eventName: string, rows: EventRegistrationParticipant[]) {
  const headers = [
    'event',
    'full_name',
    'email',
    'title',
    'affiliation',
    'country',
    'membership_status',
    'tier',
    'amount_total',
    'currency',
    'payment_status',
    'paid_at',
    'stripe_session_id',
    'stripe_payment_intent_id',
    'created_at',
  ];
  const lines = [headers.join(',')].concat(rows.map((r) => headers.map((h) => {
    const v = (r as any)[h] ?? '';
    const s = String(v).replaceAll('"', '""');
    return `"${s}"`;
  }).join(',')));
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${eventName || 'event'}-participants.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminEvents() {
  const [events, setEvents] = useState<EventRegistrationEventSummary[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);

  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [participants, setParticipants] = useState<EventRegistrationParticipant[]>([]);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [participantsError, setParticipantsError] = useState<string | null>(null);

  async function loadEvents() {
    setEventsLoading(true);
    setEventsError(null);
    try {
      const r = await fetchEventRegistrationEvents();
      setEvents(r.items || []);
    } catch (e: any) {
      setEventsError(e?.message || 'Failed to load events.');
    } finally {
      setEventsLoading(false);
    }
  }

  async function loadParticipants(eventName: string) {
    setParticipantsLoading(true);
    setParticipantsError(null);
    try {
      const r = await fetchEventRegistrationParticipants(eventName);
      setParticipants(r.items || []);
    } catch (e: any) {
      setParticipantsError(e?.message || 'Failed to load participants.');
    } finally {
      setParticipantsLoading(false);
    }
  }

  useEffect(() => {
    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedSummary = useMemo(() => {
    if (!selectedEvent) return null;
    return events.find((e) => e.event === selectedEvent) || null;
  }, [events, selectedEvent]);

  return (
    <div className="max-w-7xl">
      <div className="grid grid-cols-3 items-center gap-2">
        <div />
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Events</h1>
        </div>
        <div className="flex gap-2 justify-end">
          {selectedEvent && (
            <Button
              variant="outline"
              onClick={() => {
                setSelectedEvent(null);
                setParticipants([]);
                setParticipantsError(null);
              }}
            >
              Back to events
            </Button>
          )}
          <Button variant="outline" onClick={() => loadEvents()} disabled={eventsLoading}>
            Refresh
          </Button>
          {selectedEvent && (
            <Button
              variant="outline"
              onClick={() => exportParticipantsCsv(selectedEvent, participants)}
              disabled={participantsLoading || participants.length === 0}
            >
              Export participants CSV
            </Button>
          )}
        </div>
      </div>

      {!selectedEvent && (
        <div className="mt-4">
          {eventsError && <div className="text-sm text-red-600 mb-3">{eventsError}</div>}
          <div className="rounded-lg border bg-white overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Last paid</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {eventsLoading && (
                  <TableRow>
                    <TableCell colSpan={5}>Loading…</TableCell>
                  </TableRow>
                )}
                {!eventsLoading && events.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5}>No events with registrations yet.</TableCell>
                  </TableRow>
                )}
                {!eventsLoading && events.map((e) => (
                  <TableRow key={e.event} className="cursor-pointer">
                    <TableCell className="font-medium">{e.event}</TableCell>
                    <TableCell>{e.paid}</TableCell>
                    <TableCell>{e.total}</TableCell>
                    <TableCell>{fmtDate(e.last_paid_at)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          setSelectedEvent(e.event);
                          setParticipants([]);
                          await loadParticipants(e.event);
                        }}
                      >
                        View participants
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {selectedEvent && (
        <div className="mt-6">
          <div className="mb-3">
            <div className="text-lg font-semibold">{selectedEvent}</div>
            {selectedSummary && (
              <div className="text-sm text-muted-foreground">
                Paid: {selectedSummary.paid} / Total: {selectedSummary.total}
              </div>
            )}
          </div>

          {participantsError && <div className="text-sm text-red-600 mb-3">{participantsError}</div>}

          <div className="rounded-lg border bg-white overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Affiliation</TableHead>
                  <TableHead>Country/Region</TableHead>
                  <TableHead>Membership / ISI ID</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Paid at</TableHead>
                  <TableHead className="text-right">Stripe session</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {participantsLoading && (
                  <TableRow>
                    <TableCell colSpan={9}>Loading…</TableCell>
                  </TableRow>
                )}
                {!participantsLoading && participants.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9}>No participants found.</TableCell>
                  </TableRow>
                )}
                {!participantsLoading && participants.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.full_name || ''}</TableCell>
                    <TableCell>{p.email || ''}</TableCell>
                    <TableCell>{p.affiliation || ''}</TableCell>
                    <TableCell>{p.country || ''}</TableCell>
                    <TableCell className="font-mono">{membershipLabel(p.membership_status)}</TableCell>
                    <TableCell>{p.tier || ''}</TableCell>
                    <TableCell>{fmtMoney(p.amount_total, p.currency)}</TableCell>
                    <TableCell>{fmtDate(p.paid_at)}</TableCell>
                    <TableCell className="text-right font-mono">{p.stripe_session_id}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}

