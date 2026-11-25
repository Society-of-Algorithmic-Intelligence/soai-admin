import { useCallback, useEffect, useState } from 'react';
import { Download, Pencil, Plus, RefreshCw, Trash2, Users } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../components/ui/table';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '../components/ui/sheet';
import {
  fetchAdminJobs,
  createAdminJob,
  updateAdminJob,
  deleteAdminJob,
  fetchAdminJobApplications,
  updateAdminJobApplication,
  deleteAdminJobApplication,
  downloadAdminJobResume,
} from '../lib/api';
import type {
  JobPosting,
  JobInput,
  JobApplication,
  JobApplicationStatus,
  JobStatus,
} from '../types';

const EMPTY_FORM: JobForm = {
  title: '',
  department: '',
  location: '',
  employment_type: 'Full-time',
  summary: '',
  description: '',
  responsibilities: '',
  requirements: '',
  salary_range: '',
  apply_email: '',
  apply_url: '',
  status: 'DRAFT',
};

type JobForm = {
  title: string;
  department: string;
  location: string;
  employment_type: string;
  summary: string;
  description: string;
  responsibilities: string;
  requirements: string;
  salary_range: string;
  apply_email: string;
  apply_url: string;
  status: JobStatus;
};

const EMPLOYMENT_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship', 'Temporary', 'Other'];
const APPLICATION_STATUSES: JobApplicationStatus[] = ['NEW', 'REVIEWED', 'SHORTLISTED', 'REJECTED'];

function fmtDate(value: string | null | undefined) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString();
}

function fmtSize(bytes: number | null | undefined) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function safeHttpUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? value : null;
  } catch {
    return null;
  }
}

function jobStatusClass(status: JobStatus) {
  if (status === 'PUBLISHED') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (status === 'CLOSED') return 'border-red-200 bg-red-50 text-red-700';
  return 'border-gray-200 bg-gray-100 text-gray-600';
}

function applicationStatusClass(status: JobApplicationStatus) {
  if (status === 'SHORTLISTED') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (status === 'REVIEWED') return 'border-amber-200 bg-amber-50 text-amber-700';
  if (status === 'REJECTED') return 'border-red-200 bg-red-50 text-red-700';
  return 'border-blue-200 bg-blue-50 text-blue-700';
}

function jobStatusLabel(status: JobStatus) {
  if (status === 'PUBLISHED') return 'Published';
  if (status === 'CLOSED') return 'Closed';
  return 'Draft';
}

const selectClass =
  'h-9 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-[#003d7b] focus:outline-none focus:ring-1 focus:ring-[#003d7b]';
const textareaClass =
  'min-h-[90px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#003d7b] focus:outline-none focus:ring-1 focus:ring-[#003d7b]';

export default function AdminJobs() {
  const [tab, setTab] = useState<'jobs' | 'applications'>('jobs');
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [jobsError, setJobsError] = useState<string | null>(null);

  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [appsLoading, setAppsLoading] = useState(false);
  const [appsError, setAppsError] = useState<string | null>(null);
  const [jobFilter, setJobFilter] = useState('all');

  const [editingJob, setEditingJob] = useState<JobPosting | 'new' | null>(null);
  const [jobForm, setJobForm] = useState<JobForm>(EMPTY_FORM);
  const [jobSaving, setJobSaving] = useState(false);
  const [jobFormError, setJobFormError] = useState<string | null>(null);

  const [viewingApp, setViewingApp] = useState<JobApplication | null>(null);
  const [appStatus, setAppStatus] = useState<JobApplicationStatus>('NEW');
  const [appNotes, setAppNotes] = useState('');
  const [appSaving, setAppSaving] = useState(false);
  const [appError, setAppError] = useState<string | null>(null);

  const loadJobs = useCallback(async () => {
    setJobsLoading(true);
    setJobsError(null);
    try {
      const response = await fetchAdminJobs();
      setJobs(response.items || []);
    } catch (error) {
      setJobsError(errorMessage(error, 'Failed to load jobs.'));
    } finally {
      setJobsLoading(false);
    }
  }, []);

  const loadApplications = useCallback(async (filter: string) => {
    setAppsLoading(true);
    setAppsError(null);
    try {
      const response = await fetchAdminJobApplications(filter === 'all' ? undefined : filter);
      setApplications(response.items || []);
    } catch (error) {
      setAppsError(errorMessage(error, 'Failed to load applications.'));
    } finally {
      setAppsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadJobs();
  }, [loadJobs]);

  useEffect(() => {
    if (tab === 'applications') void loadApplications(jobFilter);
  }, [tab, jobFilter, loadApplications]);

  const totalApplications = jobs.reduce((sum, job) => sum + (job.application_count || 0), 0);
  const publishedCount = jobs.filter((job) => job.status === 'PUBLISHED').length;
  const linkedinHref = safeHttpUrl(viewingApp?.linkedin_url);
  const portfolioHref = safeHttpUrl(viewingApp?.portfolio_url);

  function openNewJob() {
    setJobForm(EMPTY_FORM);
    setJobFormError(null);
    setEditingJob('new');
  }

  function openEditJob(job: JobPosting) {
    setJobForm({
      title: job.title,
      department: job.department || '',
      location: job.location || '',
      employment_type: job.employment_type || 'Full-time',
      summary: job.summary || '',
      description: job.description || '',
      responsibilities: job.responsibilities || '',
      requirements: job.requirements || '',
      salary_range: job.salary_range || '',
      apply_email: job.apply_email || '',
      apply_url: job.apply_url || '',
      status: job.status,
    });
    setJobFormError(null);
    setEditingJob(job);
  }

  async function saveJob() {
    if (!jobForm.title.trim()) {
      setJobFormError('A job title is required.');
      return;
    }
    setJobSaving(true);
    setJobFormError(null);
    const payload: JobInput = {
      title: jobForm.title.trim(),
      department: jobForm.department.trim() || undefined,
      location: jobForm.location.trim() || undefined,
      employment_type: jobForm.employment_type,
      summary: jobForm.summary.trim() || undefined,
      description: jobForm.description.trim() || undefined,
      responsibilities: jobForm.responsibilities.trim() || undefined,
      requirements: jobForm.requirements.trim() || undefined,
      salary_range: jobForm.salary_range.trim() || undefined,
      apply_email: jobForm.apply_email.trim() || undefined,
      apply_url: jobForm.apply_url.trim() || undefined,
      status: jobForm.status,
    };

    try {
      if (editingJob === 'new') {
        await createAdminJob(payload);
      } else if (editingJob) {
        await updateAdminJob(editingJob.id, payload);
      }
      setEditingJob(null);
      await loadJobs();
    } catch (error) {
      setJobFormError(errorMessage(error, 'Failed to save the job.'));
    } finally {
      setJobSaving(false);
    }
  }

  async function removeJob(job: JobPosting) {
    if (!confirm(`Delete "${job.title}" and all of its applications? This cannot be undone.`)) return;
    try {
      await deleteAdminJob(job.id);
      if (jobFilter === job.id) setJobFilter('all');
      await loadJobs();
      if (tab === 'applications') {
        await loadApplications(jobFilter === job.id ? 'all' : jobFilter);
      }
    } catch (error) {
      setJobsError(errorMessage(error, 'Failed to delete the job.'));
    }
  }

  function openApplication(application: JobApplication) {
    setViewingApp(application);
    setAppStatus(application.status);
    setAppNotes(application.notes || '');
    setAppError(null);
  }

  async function saveApplication() {
    if (!viewingApp) return;
    setAppSaving(true);
    setAppError(null);
    try {
      await updateAdminJobApplication(viewingApp.id, {
        status: appStatus,
        notes: appNotes.trim(),
      });
      setViewingApp(null);
      await loadApplications(jobFilter);
      await loadJobs();
    } catch (error) {
      setAppError(errorMessage(error, 'Failed to update the application.'));
    } finally {
      setAppSaving(false);
    }
  }

  async function removeApplication(application: JobApplication) {
    if (!confirm(`Delete the application from ${application.full_name}? This cannot be undone.`)) {
      return;
    }
    try {
      await deleteAdminJobApplication(application.id);
      setViewingApp(null);
      await loadApplications(jobFilter);
      await loadJobs();
    } catch (error) {
      setAppsError(errorMessage(error, 'Failed to delete the application.'));
    }
  }

  async function downloadResume(application: JobApplication) {
    try {
      await downloadAdminJobResume(application.id, application.resume_filename);
    } catch (error) {
      setAppsError(errorMessage(error, 'Failed to download the resume.'));
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Jobs</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {publishedCount} published · {jobs.length} postings · {totalApplications} applications
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => (tab === 'jobs' ? void loadJobs() : void loadApplications(jobFilter))}
            disabled={jobsLoading || appsLoading}
            className="gap-1.5"
          >
            <RefreshCw className="size-3.5" /> Refresh
          </Button>
          <Button size="sm" onClick={openNewJob} className="gap-1.5">
            <Plus className="size-3.5" /> New job
          </Button>
        </div>
      </div>

      <div className="mb-6 flex gap-4 border-b">
        <button
          type="button"
          onClick={() => setTab('jobs')}
          className={`-mb-px border-b-2 px-1 pb-2 text-sm font-medium transition-colors ${
            tab === 'jobs'
              ? 'border-[#003d7b] text-[#003d7b]'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          Job postings
        </button>
        <button
          type="button"
          onClick={() => setTab('applications')}
          className={`-mb-px border-b-2 px-1 pb-2 text-sm font-medium transition-colors ${
            tab === 'applications'
              ? 'border-[#003d7b] text-[#003d7b]'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          Applications
        </button>
      </div>

      {tab === 'jobs' && (
        <div>
          {jobsError && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {jobsError}
            </div>
          )}
          <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="border-b bg-gray-50">
                  <TableHead className="font-semibold text-gray-700">Role</TableHead>
                  <TableHead className="font-semibold text-gray-700">Location</TableHead>
                  <TableHead className="font-semibold text-gray-700">Type</TableHead>
                  <TableHead className="font-semibold text-gray-700">Status</TableHead>
                  <TableHead className="font-semibold text-gray-700">Applications</TableHead>
                  <TableHead className="font-semibold text-gray-700">Updated</TableHead>
                  <TableHead className="text-right font-semibold text-gray-700">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobsLoading && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      Loading jobs…
                    </TableCell>
                  </TableRow>
                )}
                {!jobsLoading && jobs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      No job postings yet. Create one to get started.
                    </TableCell>
                  </TableRow>
                )}
                {!jobsLoading &&
                  jobs.map((job) => (
                    <TableRow key={job.id} className="transition-colors hover:bg-slate-50">
                      <TableCell>
                        <div className="font-medium text-gray-900">{job.title}</div>
                        {job.department && (
                          <div className="mt-0.5 text-xs text-gray-500">{job.department}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">{job.location || '—'}</TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {job.employment_type || '—'}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${jobStatusClass(job.status)}`}
                        >
                          {jobStatusLabel(job.status)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-sm font-medium text-[#003d7b] hover:underline"
                          onClick={() => {
                            setJobFilter(job.id);
                            setTab('applications');
                          }}
                        >
                          <Users className="size-3.5" />
                          {job.application_count || 0}
                        </button>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {fmtDate(job.updated_at || job.created_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditJob(job)}
                            className="gap-1"
                          >
                            <Pencil className="size-3.5" /> Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => void removeJob(job)}
                            aria-label={`Delete ${job.title}`}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {tab === 'applications' && (
        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {appsLoading ? 'Loading applications…' : `${applications.length} applications shown`}
            </p>
            <div className="flex items-center gap-2">
              <Label htmlFor="job-filter" className="text-sm text-gray-600">
                Role
              </Label>
              <select
                id="job-filter"
                value={jobFilter}
                onChange={(event) => setJobFilter(event.target.value)}
                className={selectClass}
              >
                <option value="all">All job postings</option>
                {jobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {appsError && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {appsError}
            </div>
          )}

          <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="border-b bg-gray-50">
                  <TableHead className="font-semibold text-gray-700">Applicant</TableHead>
                  <TableHead className="font-semibold text-gray-700">Email</TableHead>
                  <TableHead className="font-semibold text-gray-700">Role</TableHead>
                  <TableHead className="font-semibold text-gray-700">Applied</TableHead>
                  <TableHead className="font-semibold text-gray-700">Status</TableHead>
                  <TableHead className="text-right font-semibold text-gray-700">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appsLoading && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      Loading applications…
                    </TableCell>
                  </TableRow>
                )}
                {!appsLoading && applications.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      No applications yet.
                    </TableCell>
                  </TableRow>
                )}
                {!appsLoading &&
                  applications.map((application) => (
                    <TableRow key={application.id} className="transition-colors hover:bg-slate-50">
                      <TableCell className="font-medium text-gray-900">
                        {application.full_name || `${application.first_name} ${application.last_name}`}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        <a href={`mailto:${application.email}`} className="hover:underline">
                          {application.email}
                        </a>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">{application.job_title}</TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {fmtDate(application.created_at)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${applicationStatusClass(application.status)}`}
                        >
                          {application.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openApplication(application)}
                          >
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => void downloadResume(application)}
                            className="gap-1"
                          >
                            <Download className="size-3.5" /> Resume
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => void removeApplication(application)}
                            aria-label={`Delete application from ${application.full_name}`}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {editingJob && (
        <Sheet
          open
          onOpenChange={(open) => {
            if (!open) setEditingJob(null);
          }}
        >
          <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
            <SheetHeader>
              <SheetTitle>{editingJob === 'new' ? 'New job posting' : 'Edit job posting'}</SheetTitle>
              <SheetDescription>
                Drafts are hidden from the public site. Set the status to Published to make the role
                live on the Jobs page.
              </SheetDescription>
            </SheetHeader>

            <div className="grid gap-4 px-4 pb-6">
              <div className="grid gap-1.5">
                <Label htmlFor="job-title">Title</Label>
                <Input
                  id="job-title"
                  value={jobForm.title}
                  onChange={(event) => setJobForm((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="e.g. Research Engineer, ML Systems"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="job-department">Department</Label>
                  <Input
                    id="job-department"
                    value={jobForm.department}
                    onChange={(event) =>
                      setJobForm((prev) => ({ ...prev, department: event.target.value }))
                    }
                    placeholder="e.g. SoAI Applied Labs"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="job-location">Location</Label>
                  <Input
                    id="job-location"
                    value={jobForm.location}
                    onChange={(event) =>
                      setJobForm((prev) => ({ ...prev, location: event.target.value }))
                    }
                    placeholder="e.g. Singapore / Remote"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="job-type">Employment type</Label>
                  <select
                    id="job-type"
                    value={jobForm.employment_type}
                    onChange={(event) =>
                      setJobForm((prev) => ({ ...prev, employment_type: event.target.value }))
                    }
                    className={selectClass}
                  >
                    {EMPLOYMENT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="job-status">Status</Label>
                  <select
                    id="job-status"
                    value={jobForm.status}
                    onChange={(event) =>
                      setJobForm((prev) => ({ ...prev, status: event.target.value as JobStatus }))
                    }
                    className={selectClass}
                  >
                    <option value="DRAFT">Draft</option>
                    <option value="PUBLISHED">Published</option>
                    <option value="CLOSED">Closed</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="job-salary">Compensation (optional)</Label>
                <Input
                  id="job-salary"
                  value={jobForm.salary_range}
                  onChange={(event) =>
                    setJobForm((prev) => ({ ...prev, salary_range: event.target.value }))
                  }
                  placeholder="e.g. Competitive / SGD 90k–120k"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="job-apply-email">Application email (optional)</Label>
                  <Input
                    id="job-apply-email"
                    type="email"
                    value={jobForm.apply_email}
                    onChange={(event) =>
                      setJobForm((prev) => ({ ...prev, apply_email: event.target.value }))
                    }
                    placeholder="hiring@example.com"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="job-apply-url">External application URL (optional)</Label>
                  <Input
                    id="job-apply-url"
                    type="url"
                    value={jobForm.apply_url}
                    onChange={(event) =>
                      setJobForm((prev) => ({ ...prev, apply_url: event.target.value }))
                    }
                    placeholder="https://..."
                  />
                </div>
              </div>
              <p className="-mt-2 text-xs text-gray-500">
                If an application email or URL is set, the public page shows that method instead of
                the built-in application form.
              </p>

              <div className="grid gap-1.5">
                <Label htmlFor="job-summary">Short summary</Label>
                <textarea
                  id="job-summary"
                  value={jobForm.summary}
                  onChange={(event) =>
                    setJobForm((prev) => ({ ...prev, summary: event.target.value }))
                  }
                  className={textareaClass}
                  placeholder="One or two sentences shown on the job card."
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="job-description">Description</Label>
                <textarea
                  id="job-description"
                  value={jobForm.description}
                  onChange={(event) =>
                    setJobForm((prev) => ({ ...prev, description: event.target.value }))
                  }
                  className={`${textareaClass} min-h-[150px]`}
                  placeholder="Role overview. Separate paragraphs with a blank line."
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="job-responsibilities">Responsibilities</Label>
                <textarea
                  id="job-responsibilities"
                  value={jobForm.responsibilities}
                  onChange={(event) =>
                    setJobForm((prev) => ({ ...prev, responsibilities: event.target.value }))
                  }
                  className={textareaClass}
                  placeholder="One responsibility per line."
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="job-requirements">Requirements</Label>
                <textarea
                  id="job-requirements"
                  value={jobForm.requirements}
                  onChange={(event) =>
                    setJobForm((prev) => ({ ...prev, requirements: event.target.value }))
                  }
                  className={textareaClass}
                  placeholder="One requirement per line."
                />
              </div>

              {jobFormError && <p className="text-sm text-red-600">{jobFormError}</p>}
            </div>

            <SheetFooter>
              <Button variant="outline" onClick={() => setEditingJob(null)}>
                Cancel
              </Button>
              <Button onClick={() => void saveJob()} disabled={jobSaving}>
                {jobSaving ? 'Saving…' : editingJob === 'new' ? 'Create job' : 'Save changes'}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      )}

      {viewingApp && (
        <Sheet
          open
          onOpenChange={(open) => {
            if (!open) setViewingApp(null);
          }}
        >
          <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
            <SheetHeader>
              <SheetTitle>{viewingApp.full_name}</SheetTitle>
              <SheetDescription>
                Application for {viewingApp.job_title} · {fmtDate(viewingApp.created_at)}
              </SheetDescription>
            </SheetHeader>

            <div className="grid gap-5 px-4 pb-6">
              <div className="grid gap-3 rounded-md border bg-gray-50 p-4 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-gray-500">Email</span>
                  <a href={`mailto:${viewingApp.email}`} className="font-medium text-[#003d7b] hover:underline">
                    {viewingApp.email}
                  </a>
                </div>
                {viewingApp.phone && (
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500">Phone</span>
                    <span className="font-medium">{viewingApp.phone}</span>
                  </div>
                )}
                {linkedinHref && (
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500">LinkedIn</span>
                    <a
                      href={linkedinHref}
                      target="_blank"
                      rel="noreferrer"
                      className="max-w-[60%] truncate font-medium text-[#003d7b] hover:underline"
                    >
                      {linkedinHref}
                    </a>
                  </div>
                )}
                {portfolioHref && (
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500">Portfolio</span>
                    <a
                      href={portfolioHref}
                      target="_blank"
                      rel="noreferrer"
                      className="max-w-[60%] truncate font-medium text-[#003d7b] hover:underline"
                    >
                      {portfolioHref}
                    </a>
                  </div>
                )}
              </div>

              <div className="grid gap-2">
                <Label>Resume</Label>
                <div className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-gray-900">{viewingApp.resume_filename}</p>
                    <p className="text-xs text-gray-500">{fmtSize(viewingApp.resume_size)}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void downloadResume(viewingApp)}
                    className="gap-1"
                  >
                    <Download className="size-3.5" /> Download
                  </Button>
                </div>
              </div>

              {viewingApp.cover_letter && (
                <div className="grid gap-2">
                  <Label>Cover letter</Label>
                  <div className="max-h-60 overflow-y-auto whitespace-pre-wrap rounded-md border bg-gray-50 p-3 text-sm leading-relaxed text-gray-700">
                    {viewingApp.cover_letter}
                  </div>
                </div>
              )}

              <div className="grid gap-2">
                <Label htmlFor="app-status">Status</Label>
                <select
                  id="app-status"
                  value={appStatus}
                  onChange={(event) => setAppStatus(event.target.value as JobApplicationStatus)}
                  className={selectClass}
                >
                  {APPLICATION_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status.charAt(0) + status.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="app-notes">Internal notes</Label>
                <textarea
                  id="app-notes"
                  value={appNotes}
                  onChange={(event) => setAppNotes(event.target.value)}
                  className={textareaClass}
                  placeholder="Notes are only visible to admins."
                />
              </div>

              {appError && <p className="text-sm text-red-600">{appError}</p>}
            </div>

            <SheetFooter>
              <Button
                variant="destructive"
                onClick={() => void removeApplication(viewingApp)}
                className="mr-auto"
              >
                Delete
              </Button>
              <Button variant="outline" onClick={() => setViewingApp(null)}>
                Cancel
              </Button>
              <Button onClick={() => void saveApplication()} disabled={appSaving}>
                {appSaving ? 'Saving…' : 'Save changes'}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
