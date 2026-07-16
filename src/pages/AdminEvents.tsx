import { Fragment, useEffect, useMemo, useState } from 'react';
import { Button } from '../components/ui/button';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../components/ui/table';
import {
  fetchEventRegistrationEvents,
  fetchEventRegistrationParticipants,
  deleteEventRegistrationParticipant,
  resendEventRegistrationEmail,
  syncHotelBookingsToExternalSheet,
} from '../lib/api';
import type {
  EventRegistrationEventSummary,
  EventRegistrationParticipant,
  HackathonRegistration,
  HotelBooking,
} from '../types';

function fmtDate(value: string | null | undefined) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}

function fmtMoney(amountTotal: number | null | undefined, currency: string | null | undefined) {
  if (amountTotal == null) return '';
  return `${(currency || 'SGD').toUpperCase()} ${(amountTotal / 100).toFixed(2)}`;
}

function membershipLabel(value: string | null | undefined) {
  const status = String(value || '').trim();
  if (!status) return '';
  if (status === 'existing') return 'Existing SoAI member';
  if (status === 'join') return 'Joined SoAI';
  if (status === 'nonmember') return 'Non-member';
  return status;
}

function handsOnTutorialLabel(value: string | null | undefined) {
  const preference = String(value || '').trim();
  if (!preference) return '';
  if (preference === 'quantum') return 'Quantum Computing';
  if (preference === 'ai_coding') return 'AI for Coding';
  if (preference === 'ai_trading') return 'AI Algorithmic Trading';
  if (preference === 'na') return 'NA';
  return preference;
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function downloadCsv(filename: string, headers: string[], rows: Array<Record<string, unknown>>) {
  const lines = [
    headers.join(','),
    ...rows.map((row) =>
      headers
        .map((header) => `"${String(row[header] ?? '').replaceAll('"', '""')}"`)
        .join(','),
    ),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function exportStripeParticipants(eventName: string, rows: EventRegistrationParticipant[]) {
  const headers = [
    'event',
    'full_name',
    'email',
    'title',
    'affiliation',
    'country',
    'membership_status',
    'tier',
    'hands_on_tutorial_preference',
    'amount_total',
    'currency',
    'payment_status',
    'paid_at',
    'stripe_session_id',
    'stripe_payment_intent_id',
    'created_at',
  ];
  downloadCsv(
    `${eventName || 'event'}-participants.csv`,
    headers,
    rows.map((row) => ({ ...row })),
  );
}

function exportHotelBookings(rows: HotelBooking[]) {
  const headers = [
    'email',
    'first_name',
    'last_name',
    'room_type',
    'check_in',
    'check_out',
    'nights',
    'arrival_flight_details',
    'departure_flight_details',
    'remarks',
    'amount_total',
    'currency',
    'payment_status',
    'paid_at',
    'stripe_session_id',
    'created_at',
  ];
  downloadCsv('hotel-bookings.csv', headers, rows.map((row) => ({ ...row })));
}

function exportHackathonRegistrations(eventName: string, rows: HackathonRegistration[]) {
  const headers = [
    'event',
    'full_name',
    'email',
    'title',
    'affiliation',
    'country',
    'membership_status',
    'soai_member_id',
    'registration_type',
    'team_name',
    'team_size',
    'team_non_member_count',
    'team_members',
    'amount_total',
    'currency',
    'registration_status',
    'payment_status',
    'paid_at',
    'stripe_session_id',
    'created_at',
  ];
  downloadCsv(
    `${eventName || 'hackathon'}-registrations.csv`,
    headers,
    rows.map((row) => ({
      ...row,
      team_members: row.team_members
        .map((member) => `${member.name} <${member.email}> (${member.affiliation})`)
        .join('; '),
    })),
  );
}

function PaymentStatusBadge({ status }: { status: string }) {
  if (status === 'paid')
    return <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-xs font-medium text-emerald-700">Paid</span>;
  if (status === 'pending')
    return <span className="inline-flex items-center rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs font-medium text-amber-700">Pending</span>;
  return <span className="inline-flex items-center rounded-full bg-gray-100 border border-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600">{status}</span>;
}

export default function AdminEvents() {
  const [events, setEvents] = useState<EventRegistrationEventSummary[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [participantSource, setParticipantSource] = useState<'stripe' | 'hackathon' | 'hotel'>('stripe');
  const [participants, setParticipants] = useState<EventRegistrationParticipant[]>([]);
  const [hackathonRegistrations, setHackathonRegistrations] = useState<HackathonRegistration[]>([]);
  const [hotelBookings, setHotelBookings] = useState<HotelBooking[]>([]);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [participantsError, setParticipantsError] = useState<string | null>(null);
  const [expandedRegistrationId, setExpandedRegistrationId] = useState<string | null>(null);
  const [hotelSyncing, setHotelSyncing] = useState(false);
  const [hotelSyncMessage, setHotelSyncMessage] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [resendResults, setResendResults] = useState<Record<string, { ok: boolean; msg: string }>>({});

  async function loadEvents() {
    setEventsLoading(true);
    setEventsError(null);
    try {
      const response = await fetchEventRegistrationEvents();
      setEvents(response.items || []);
    } catch (error) {
      setEventsError(errorMessage(error, 'Failed to load events.'));
    } finally {
      setEventsLoading(false);
    }
  }

  async function loadParticipants(eventName: string) {
    setParticipantsLoading(true);
    setParticipantsError(null);
    setExpandedRegistrationId(null);
    setResendResults({});
    try {
      const response = await fetchEventRegistrationParticipants(eventName);
      setHotelSyncMessage(null);
      setParticipantSource(response.source);
      if (response.source === 'hackathon') {
        setHackathonRegistrations(response.items);
        setParticipants([]);
        setHotelBookings([]);
      } else if (response.source === 'hotel') {
        setHotelBookings(response.items);
        setParticipants([]);
        setHackathonRegistrations([]);
      } else {
        setParticipants(response.items);
        setHackathonRegistrations([]);
        setHotelBookings([]);
      }
    } catch (error) {
      setParticipantsError(errorMessage(error, 'Failed to load participants.'));
    } finally {
      setParticipantsLoading(false);
    }
  }

  async function handleDelete(source: 'stripe' | 'hackathon' | 'hotel', id: string, label: string) {
    if (!confirm(`Delete registration for ${label}? This cannot be undone.`)) return;
    try {
      await deleteEventRegistrationParticipant(source, id);
      if (source === 'hackathon') {
        setHackathonRegistrations((rows) => rows.filter((row) => row.id !== id));
      } else if (source === 'hotel') {
        setHotelBookings((rows) => rows.filter((row) => row.id !== id));
      } else {
        setParticipants((rows) => rows.filter((row) => row.id !== id));
      }
      void loadEvents();
    } catch (error) {
      setParticipantsError(errorMessage(error, 'Failed to delete registration.'));
    }
  }

  async function handleHotelSheetSync() {
    setHotelSyncing(true);
    setHotelSyncMessage(null);
    setParticipantsError(null);
    try {
      const result = await syncHotelBookingsToExternalSheet();
      setHotelSyncMessage(`Synced ${result.count} hotel booking${result.count === 1 ? '' : 's'} to the external sheet.`);
    } catch (error) {
      setParticipantsError(errorMessage(error, 'Failed to sync hotel bookings to the external sheet.'));
    } finally {
      setHotelSyncing(false);
    }
  }

  async function handleResendEmail(id: string) {
    setResendingId(id);
    setResendResults((prev) => ({ ...prev, [id]: { ok: false, msg: '' } }));
    try {
      const result = await resendEventRegistrationEmail(id);
      setResendResults((prev) => ({ ...prev, [id]: { ok: true, msg: `Sent to ${result.email}` } }));
    } catch (error) {
      setResendResults((prev) => ({ ...prev, [id]: { ok: false, msg: errorMessage(error, 'Failed to resend.') } }));
    } finally {
      setResendingId(null);
    }
  }

  useEffect(() => {
    void loadEvents();
  }, []);

  const selectedSummary = useMemo(
    () => events.find((event) => event.event === selectedEvent) || null,
    [events, selectedEvent],
  );

  const visibleRegistrationCount =
    participantSource === 'hackathon'
      ? hackathonRegistrations.length
      : participantSource === 'hotel'
        ? hotelBookings.length
        : participants.length;

  return (
    <div className="p-6 md:p-8 max-w-7xl">
      {/* Page header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          {selectedEvent ? (
            <>
              <button
                className="text-xs text-[#003d7b] hover:underline mb-1 block"
                onClick={() => {
                  setSelectedEvent(null);
                  setParticipants([]);
                  setHackathonRegistrations([]);
                  setHotelBookings([]);
                  setParticipantsError(null);
                  setHotelSyncMessage(null);
                }}
              >
                ← All events
              </button>
              <h1 className="text-xl font-semibold text-gray-900 leading-tight">{selectedEvent}</h1>
              {selectedSummary && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  {selectedSummary.paid} paid · {selectedSummary.total} total registrations
                </p>
              )}
            </>
          ) : (
            <>
              <h1 className="text-xl font-semibold text-gray-900">Events</h1>
              <p className="text-sm text-muted-foreground mt-0.5">View and manage event registrations.</p>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => (selectedEvent ? loadParticipants(selectedEvent) : loadEvents())}
            disabled={eventsLoading || participantsLoading}
          >
            Refresh
          </Button>
          {selectedEvent && (
            <Button
              variant="outline"
              size="sm"
              disabled={participantsLoading || visibleRegistrationCount === 0}
              onClick={() => {
                if (participantSource === 'hackathon') exportHackathonRegistrations(selectedEvent, hackathonRegistrations);
                else if (participantSource === 'hotel') exportHotelBookings(hotelBookings);
                else exportStripeParticipants(selectedEvent, participants);
              }}
            >
              Export CSV
            </Button>
          )}
          {selectedEvent && participantSource === 'hotel' && (
            <Button variant="outline" size="sm" disabled={hotelSyncing || participantsLoading} onClick={handleHotelSheetSync}>
              {hotelSyncing ? 'Syncing…' : 'Sync to sheet'}
            </Button>
          )}
        </div>
      </div>

      {!selectedEvent && (
        <div>
          {eventsError && <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{eventsError}</div>}
          <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 border-b">
                  <TableHead className="font-semibold text-gray-700">Event</TableHead>
                  <TableHead className="font-semibold text-gray-700">Source</TableHead>
                  <TableHead className="font-semibold text-gray-700">Paid / Confirmed</TableHead>
                  <TableHead className="font-semibold text-gray-700">Total</TableHead>
                  <TableHead className="font-semibold text-gray-700">Last Activity</TableHead>
                  <TableHead className="text-right font-semibold text-gray-700">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {eventsLoading && (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
                )}
                {!eventsLoading && events.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No events with registrations yet.</TableCell></TableRow>
                )}
                {!eventsLoading && events.map((event) => (
                  <TableRow key={event.event} className="hover:bg-slate-50 transition-colors">
                    <TableCell className="font-medium">{event.event}</TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {event.source === 'hackathon' ? 'Hackathon form' : event.source === 'hotel' ? 'Hotel booking' : 'Stripe'}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                        {event.paid}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">{event.total}</TableCell>
                    <TableCell className="text-sm text-gray-500">{fmtDate(event.last_paid_at)}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" className="h-7 text-xs"
                        onClick={async () => { setSelectedEvent(event.event); await loadParticipants(event.event); }}
                      >
                        View →
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
        <div>
          {participantsError && <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{participantsError}</div>}
          {hotelSyncMessage && <div className="mb-4 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">{hotelSyncMessage}</div>}

          {participantSource === 'hotel' ? (
            <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 border-b">
                    <TableHead className="font-semibold text-gray-700">Name</TableHead>
                    <TableHead className="font-semibold text-gray-700">Email</TableHead>
                    <TableHead className="font-semibold text-gray-700">Room Type</TableHead>
                    <TableHead className="font-semibold text-gray-700">Check-in</TableHead>
                    <TableHead className="font-semibold text-gray-700">Check-out</TableHead>
                    <TableHead className="font-semibold text-gray-700">Nights</TableHead>
                    <TableHead className="font-semibold text-gray-700">Amount</TableHead>
                    <TableHead className="font-semibold text-gray-700">Status</TableHead>
                    <TableHead className="font-semibold text-gray-700">Booked</TableHead>
                    <TableHead className="text-right font-semibold text-gray-700">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {participantsLoading && (
                    <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
                  )}
                  {!participantsLoading && hotelBookings.length === 0 && (
                    <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">No hotel bookings yet.</TableCell></TableRow>
                  )}
                  {!participantsLoading && hotelBookings.map((booking) => (
                    <TableRow key={booking.id} className="hover:bg-slate-50 transition-colors">
                      <TableCell className="font-medium">{booking.first_name} {booking.last_name}</TableCell>
                      <TableCell className="text-sm">{booking.email}</TableCell>
                      <TableCell className="text-sm">{booking.room_type}</TableCell>
                      <TableCell className="text-sm">{booking.check_in}</TableCell>
                      <TableCell className="text-sm">{booking.check_out}</TableCell>
                      <TableCell className="text-sm">{booking.nights}</TableCell>
                      <TableCell className="text-sm font-medium">{fmtMoney(booking.amount_total, booking.currency)}</TableCell>
                      <TableCell><PaymentStatusBadge status={booking.payment_status} /></TableCell>
                      <TableCell className="text-xs text-gray-500">{fmtDate(booking.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="destructive" size="sm" className="h-7 text-xs"
                          onClick={() => handleDelete('hotel', booking.id, booking.email || 'this guest')}
                        >
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : participantSource === 'hackathon' ? (
            <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 border-b">
                    <TableHead className="font-semibold text-gray-700">Name</TableHead>
                    <TableHead className="font-semibold text-gray-700">Email</TableHead>
                    <TableHead className="font-semibold text-gray-700">Registration</TableHead>
                    <TableHead className="font-semibold text-gray-700">Affiliation</TableHead>
                    <TableHead className="font-semibold text-gray-700">Country/Region</TableHead>
                    <TableHead className="font-semibold text-gray-700">Membership</TableHead>
                    <TableHead className="font-semibold text-gray-700">Status</TableHead>
                    <TableHead className="font-semibold text-gray-700">Amount</TableHead>
                    <TableHead className="font-semibold text-gray-700">Registered</TableHead>
                    <TableHead className="text-right font-semibold text-gray-700">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {participantsLoading && (
                    <TableRow>
                      <TableCell colSpan={10}>Loading...</TableCell>
                    </TableRow>
                  )}
                  {!participantsLoading && hackathonRegistrations.length === 0 && (
                    <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">No hackathon registrations found.</TableCell></TableRow>
                  )}
                  {!participantsLoading &&
                    hackathonRegistrations.map((registration) => (
                      <Fragment key={registration.id}>
                        <TableRow className="hover:bg-slate-50 transition-colors">
                          <TableCell className="font-medium">{registration.full_name}</TableCell>
                          <TableCell>{registration.email}</TableCell>
                          <TableCell>
                            {registration.registration_type === 'team'
                              ? `Team: ${registration.team_name || ''}`
                              : 'Individual'}
                          </TableCell>
                          <TableCell>{registration.affiliation}</TableCell>
                          <TableCell>{registration.country}</TableCell>
                          <TableCell>
                            <div>{membershipLabel(registration.membership_status)}</div>
                            {registration.soai_member_id && (
                              <div className="font-mono text-xs">{registration.soai_member_id}</div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div>{registration.registration_status}</div>
                            <div className="text-xs text-muted-foreground">
                              Payment: {registration.payment_status}
                            </div>
                          </TableCell>
                          <TableCell>{fmtMoney(registration.amount_total, registration.currency)}</TableCell>
                          <TableCell>{fmtDate(registration.created_at)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  setExpandedRegistrationId((current) =>
                                    current === registration.id ? null : registration.id,
                                  )
                                }
                              >
                                {expandedRegistrationId === registration.id ? 'Hide' : 'Details'}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() =>
                                  handleDelete('hackathon', registration.id, registration.full_name || registration.email)
                                }
                              >
                                Delete
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        {expandedRegistrationId === registration.id && (
                          <TableRow>
                            <TableCell colSpan={10} className="bg-slate-50 p-0">
                              <div className="grid gap-3 px-6 py-4 text-sm md:grid-cols-2 xl:grid-cols-3">
                                <div>
                                  <span className="text-muted-foreground">Title:</span>{' '}
                                  {registration.title}
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Personal webpage:</span>{' '}
                                  {registration.personal_webpage ? (
                                    <a
                                      href={registration.personal_webpage}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="underline"
                                    >
                                      {registration.personal_webpage}
                                    </a>
                                  ) : (
                                    ''
                                  )}
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Paid at:</span>{' '}
                                  {fmtDate(registration.paid_at)}
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Stripe session:</span>{' '}
                                  <span className="font-mono">{registration.stripe_session_id || ''}</span>
                                </div>
                                {registration.registration_type === 'team' && (
                                  <>
                                    <div>
                                      <span className="text-muted-foreground">Team size:</span>{' '}
                                      {registration.team_size}
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">
                                        Non-member teammates:
                                      </span>{' '}
                                      {registration.team_non_member_count}
                                    </div>
                                    <div className="md:col-span-2 xl:col-span-3">
                                      <div className="mb-2 font-medium">Additional team members</div>
                                      <div className="overflow-hidden rounded border bg-white">
                                        <Table>
                                          <TableHeader>
                                            <TableRow>
                                              <TableHead>Name</TableHead>
                                              <TableHead>Email</TableHead>
                                              <TableHead>Affiliation</TableHead>
                                            </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                            {registration.team_members.map((member) => (
                                              <TableRow key={`${registration.id}-${member.email}`}>
                                                <TableCell>{member.name}</TableCell>
                                                <TableCell>{member.email}</TableCell>
                                                <TableCell>{member.affiliation}</TableCell>
                                              </TableRow>
                                            ))}
                                          </TableBody>
                                        </Table>
                                      </div>
                                    </div>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 border-b">
                    <TableHead className="font-semibold text-gray-700">Name</TableHead>
                    <TableHead className="font-semibold text-gray-700">Email</TableHead>
                    <TableHead className="font-semibold text-gray-700">Affiliation</TableHead>
                    <TableHead className="font-semibold text-gray-700">Country/Region</TableHead>
                    <TableHead className="font-semibold text-gray-700">Membership</TableHead>
                    <TableHead className="font-semibold text-gray-700">Tier</TableHead>
                    <TableHead className="font-semibold text-gray-700">Tutorial</TableHead>
                    <TableHead className="font-semibold text-gray-700">Amount</TableHead>
                    <TableHead className="font-semibold text-gray-700">Paid at</TableHead>
                    <TableHead className="font-semibold text-gray-700">Stripe session</TableHead>
                    <TableHead className="text-right font-semibold text-gray-700">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {participantsLoading && (
                    <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
                  )}
                  {!participantsLoading && participants.length === 0 && (
                    <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground">No participants found.</TableCell></TableRow>
                  )}
                  {!participantsLoading &&
                    participants.map((participant) => (
                      <TableRow key={participant.id} className="hover:bg-slate-50 transition-colors">
                        <TableCell className="font-medium">{participant.full_name || ''}</TableCell>
                        <TableCell>{participant.email || ''}</TableCell>
                        <TableCell>{participant.affiliation || ''}</TableCell>
                        <TableCell>{participant.country || ''}</TableCell>
                        <TableCell className="font-mono">
                          {membershipLabel(participant.membership_status)}
                        </TableCell>
                        <TableCell>{participant.tier || ''}</TableCell>
                        <TableCell>
                          {handsOnTutorialLabel(participant.hands_on_tutorial_preference)}
                        </TableCell>
                        <TableCell>{fmtMoney(participant.amount_total, participant.currency)}</TableCell>
                        <TableCell>{fmtDate(participant.paid_at)}</TableCell>
                        <TableCell className="font-mono">
                          {participant.stripe_session_id}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-col items-end gap-1">
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={resendingId === participant.id}
                                onClick={() => handleResendEmail(participant.id)}
                              >
                                {resendingId === participant.id ? 'Sending…' : 'Resend Email'}
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() =>
                                  handleDelete('stripe', participant.id, participant.full_name || participant.email || 'this participant')
                                }
                              >
                                Delete
                              </Button>
                            </div>
                            {resendResults[participant.id]?.msg && (
                              <span className={`text-xs ${resendResults[participant.id].ok ? 'text-green-600' : 'text-red-600'}`}>
                                {resendResults[participant.id].msg}
                              </span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
