import { useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { broadcastEmail } from '../lib/api';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select';
import { unMemberCountries } from '../data/countries';

export default function AdminBroadcast() {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [preview, setPreview] = useState(true);
  const [planFilter, setPlanFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [recipientsPreview, setRecipientsPreview] = useState<string[] | null>(null);
  const [recipientsCount, setRecipientsCount] = useState<number | null>(null);

  const planOptions = useMemo(
    () => ['Regular Member', 'Permanent Member', 'Developing Countries', 'Student Member'],
    []
  );
  const countryOptions = useMemo(
    () => [...unMemberCountries, 'Other'],
    []
  );
  const roleOptions = useMemo(
    () => ['member', 'Executive_Committee', 'Advisory_Board', 'Country/Region_Leaders'],
    []
  );

  async function onSend(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setRecipientsPreview(null);
    setRecipientsCount(null);
    if (!subject.trim() || !body.trim()) {
      setError('Subject and message are required.');
      return;
    }
    setSubmitting(true);
    try {
      // Treat body as basic HTML; preserve line breaks.
      const html = body
        .split('\n')
        .map((line) => line.trim() ? `<p>${line}</p>` : '<p>&nbsp;</p>')
        .join('');
      const res = await broadcastEmail({
        subject: subject.trim(),
        html,
        preview,
        plan: planFilter || undefined,
        role: roleFilter.trim() || undefined,
        country: countryFilter || undefined,
      });
      if (preview && res.previewTo) {
        setSuccess(`Preview sent to ${res.previewTo}.`);
      } else if (!preview && typeof res.sent === 'number') {
        setSuccess(`Broadcast sent to ${res.sent} members.`);
      } else {
        setSuccess('Request sent successfully.');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to send broadcast.');
    } finally {
      setSubmitting(false);
    }
  }

  async function onPreviewRecipients() {
    setError(null);
    setSuccess(null);
    setRecipientsPreview(null);
    setRecipientsCount(null);
    try {
      const html = '<p>Preview recipients only</p>';
      const res = await broadcastEmail({
        subject: subject.trim() || '(preview recipients)',
        html,
        preview: false,
        list_only: true,
        plan: planFilter || undefined,
        role: roleFilter.trim() || undefined,
        country: countryFilter || undefined,
      });
      setRecipientsPreview(res.emails ?? []);
      setRecipientsCount(typeof res.count === 'number' ? res.count : (res.emails ? res.emails.length : 0));
      if (!res.emails || res.emails.length === 0) {
        setSuccess('No recipients match the current filters.');
      } else {
        setSuccess(null);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to preview recipients.');
    }
  }

  return (
    <div className="max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>Broadcast Email</CardTitle>
          <CardDescription>
            Send an announcement to all active members via Resend. Use preview first to send only to the admin address.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSend} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Subject *</label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject line"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Message *</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={10}
                className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                placeholder="Write your message... (plain text; paragraphs will be converted to basic HTML)"
                required
              />
            </div>
            <div className="pt-2 border-t mt-2 space-y-3">
              <div className="text-sm font-medium text-gray-900">Filters (optional)</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Member type</label>
                  <Select
                    value={planFilter || '__all-plans__'}
                    onValueChange={(v) => setPlanFilter(v === '__all-plans__' ? '' : v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All member types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all-plans__">All member types</SelectItem>
                      {planOptions.map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Role</label>
                  <Select
                    value={roleFilter || '__all-roles__'}
                    onValueChange={(v) => setRoleFilter(v === '__all-roles__' ? '' : v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All roles" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all-roles__">All roles</SelectItem>
                      {roleOptions.map((r) => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Country/Region</label>
                  <Select
                    value={countryFilter || '__all-countries__'}
                    onValueChange={(v) => setCountryFilter(v === '__all-countries__' ? '' : v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All countries/regions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all-countries__">All countries/regions</SelectItem>
                      {countryOptions.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="preview"
                type="checkbox"
                className="h-4 w-4"
                checked={preview}
                onChange={(e) => setPreview(e.target.checked)}
              />
              <label htmlFor="preview" className="text-sm">
                Preview only (send to admin address instead of all members)
              </label>
            </div>
            {error && <div className="text-sm text-red-600">{error}</div>}
            {success && <div className="text-sm text-green-700">{success}</div>}
            {recipientsCount !== null && (
              <div className="text-xs text-muted-foreground">
                {recipientsCount === 0
                  ? 'No recipients match the current filters.'
                  : `This would send to ${recipientsCount} recipients.`}
              </div>
            )}
            {recipientsPreview && recipientsPreview.length > 0 && (
              <div className="text-xs text-muted-foreground max-h-32 overflow-auto border rounded-md p-2 bg-muted/40">
                <div className="font-medium mb-1">Sample recipients (first {Math.min(recipientsPreview.length, 50)}):</div>
                <ul className="list-disc list-inside space-y-0.5">
                  {recipientsPreview.slice(0, 50).map((email) => (
                    <li key={email}>{email}</li>
                  ))}
                </ul>
                {recipientsPreview.length > 50 && (
                  <div className="mt-1">…and {recipientsPreview.length - 50} more</div>
                )}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onPreviewRecipients}>
                Preview recipients
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (preview ? 'Sending preview…' : 'Sending…') : (preview ? 'Send Preview' : 'Send to All Members')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}


