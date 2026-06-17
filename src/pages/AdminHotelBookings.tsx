import { useEffect, useState } from 'react';
import { Button } from '../components/ui/button';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../components/ui/table';
import { fetchHotelBookings } from '../lib/api';
import type { HotelBooking } from '../types';

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

function exportBookings(rows: HotelBooking[]) {
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

export default function AdminHotelBookings() {
  const [bookings, setBookings] = useState<HotelBooking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchHotelBookings();
      setBookings(response.items || []);
    } catch (err) {
      setError(errorMessage(err, 'Failed to load hotel bookings.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const paidCount = bookings.filter((b) => b.payment_status === 'paid').length;

  return (
    <div className="max-w-7xl p-4 md:p-6">
      <div className="grid grid-cols-3 items-center gap-2">
        <div />
        <h1 className="text-center text-2xl font-semibold">Hotel Bookings</h1>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => load()} disabled={loading}>
            Refresh
          </Button>
          <Button
            variant="outline"
            disabled={loading || bookings.length === 0}
            onClick={() => exportBookings(bookings)}
          >
            Export CSV
          </Button>
        </div>
      </div>

      <div className="mt-2 text-center text-sm text-muted-foreground">
        Paid: {paidCount} / Total: {bookings.length}
      </div>

      {error && <div className="mb-3 mt-3 text-sm text-red-600">{error}</div>}

      <div className="mt-4 overflow-x-auto rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Room Type</TableHead>
              <TableHead>Check-in</TableHead>
              <TableHead>Check-out</TableHead>
              <TableHead>Nights</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Booked</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={9}>Loading...</TableCell>
              </TableRow>
            )}
            {!loading && bookings.length === 0 && (
              <TableRow>
                <TableCell colSpan={9}>No hotel bookings yet.</TableCell>
              </TableRow>
            )}
            {!loading &&
              bookings.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell className="font-medium">
                    {booking.first_name} {booking.last_name}
                  </TableCell>
                  <TableCell>{booking.email}</TableCell>
                  <TableCell>{booking.room_type}</TableCell>
                  <TableCell>{booking.check_in}</TableCell>
                  <TableCell>{booking.check_out}</TableCell>
                  <TableCell>{booking.nights}</TableCell>
                  <TableCell>{fmtMoney(booking.amount_total, booking.currency)}</TableCell>
                  <TableCell>
                    <span
                      className={
                        booking.payment_status === 'paid'
                          ? 'rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700'
                          : 'rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700'
                      }
                    >
                      {booking.payment_status}
                    </span>
                  </TableCell>
                  <TableCell>{fmtDate(booking.created_at)}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
