import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi, jobsApi, applicationsApi } from '../../services/api';

export default function EmployerDashboard() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard-employer'],
    queryFn: async () => (await dashboardApi.employer()).data,
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [employmentType, setEmploymentType] = useState('Full-time');
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');
  const [remoteStatus, setRemoteStatus] = useState(false);
  const [requiredExperience, setRequiredExperience] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [updatingAppId, setUpdatingAppId] = useState<string | null>(null);

  const handleUpdateApplicationStatus = async (appId: string, newStatus: string) => {
    setUpdatingAppId(appId);
    try {
      await applicationsApi.updateStatus(appId, newStatus);
      refetch();
    } catch (err: any) {
      console.error('Failed to update application status:', err);
    } finally {
      setUpdatingAppId(null);
    }
  };

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);

    try {
      await jobsApi.create({
        title,
        description,
        location,
        employmentType,
        salaryMin: salaryMin ? Number(salaryMin) : undefined,
        salaryMax: salaryMax ? Number(salaryMax) : undefined,
        remoteStatus,
        requiredExperience: requiredExperience ? Number(requiredExperience) : undefined,
      });

      setTitle('');
      setDescription('');
      setLocation('');
      setEmploymentType('Full-time');
      setSalaryMin('');
      setSalaryMax('');
      setRemoteStatus(false);
      setRequiredExperience('');
      setIsModalOpen(false);
      refetch();
    } catch (err: any) {
      setFormError(err.response?.data?.error || 'Failed to create job.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (jobId: string, currentStatus: string) => {
    setTogglingId(jobId);
    try {
      const newStatus = currentStatus === 'PUBLISHED' ? 'ARCHIVED' : 'PUBLISHED';
      await jobsApi.updateStatus(jobId, newStatus);
      refetch();
    } catch (err: any) {
      console.error('Failed to toggle job status:', err);
    } finally {
      setTogglingId(null);
    }
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      PUBLISHED: 'bg-emerald-500/15 text-emerald-400',
      DRAFT: 'bg-amber-500/15 text-amber-400',
      ARCHIVED: 'bg-slate-500/15 text-slate-400',
    };
    return (
      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] ?? colors.DRAFT}`}>
        {status}
      </span>
    );
  };

  if (isLoading) return <p className="text-slate-400">Loading dashboard...</p>;
  if (error) return <p className="text-red-400">Unable to load employer dashboard.</p>;

  return (
    <div className="space-y-8 relative">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-100">Employer Dashboard</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-slate-950 hover:bg-emerald-400 transition-colors shadow-lg"
        >
          Post a Job
        </button>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-xl font-bold text-slate-100">Post a New Job</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 text-lg"
              >
                ✕
              </button>
            </div>

            {formError && <p className="text-sm text-rose-400 bg-rose-500/10 p-2.5 rounded-lg">{formError}</p>}

            <form onSubmit={handleCreateJob} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Job Title *</label>
                <input type="text" required placeholder="e.g. Senior Frontend Developer" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Description *</label>
                <textarea required rows={4} placeholder="Describe the role..." value={description} onChange={(e) => setDescription(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm focus:outline-none focus:border-emerald-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Location *</label>
                  <input type="text" required placeholder="e.g. San Francisco, CA" value={location} onChange={(e) => setLocation(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm focus:outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Employment Type</label>
                  <select value={employmentType} onChange={(e) => setEmploymentType(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 text-slate-300">
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contract">Contract</option>
                    <option value="Internship">Internship</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Min Salary</label>
                  <input type="number" placeholder="Min salary" value={salaryMin} onChange={(e) => setSalaryMin(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm focus:outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Max Salary</label>
                  <input type="number" placeholder="Max salary" value={salaryMax} onChange={(e) => setSalaryMax(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm focus:outline-none focus:border-emerald-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Required Experience (Years)</label>
                <input type="number" placeholder="e.g. 3" value={requiredExperience} onChange={(e) => setRequiredExperience(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm focus:outline-none focus:border-emerald-500" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="remoteStatus" checked={remoteStatus} onChange={(e) => setRemoteStatus(e.target.checked)} className="h-4 w-4 rounded border-slate-700 bg-slate-950 accent-emerald-500" />
                <label htmlFor="remoteStatus" className="text-sm font-medium text-slate-300 select-none">This is a Remote Position</label>
              </div>
              <div className="flex justify-end gap-3 border-t border-slate-800 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 hover:border-slate-500 transition-colors">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 transition-colors disabled:opacity-50">
                  {isSubmitting ? 'Posting...' : 'Create Job'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Jobs Section */}
      <section>
        <h2 className="mb-3 text-xl font-semibold">Your Jobs</h2>
        {(data?.activeJobs ?? []).length === 0 ? (
          <p className="text-sm text-slate-500">No jobs posted yet. Click "Post a Job" to get started!</p>
        ) : (
          <div className="grid gap-3">
            {(data?.activeJobs ?? []).map((job: {
              id: string;
              title: string;
              status: string;
              _count: { applications: number };
            }) => (
              <div key={job.id} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900 p-4 hover:border-slate-700 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{job.title}</p>
                    {statusBadge(job.status)}
                  </div>
                  <p className="text-sm text-slate-400">{job._count.applications} applicants</p>
                </div>
                <button
                  onClick={() => handleToggleStatus(job.id, job.status)}
                  disabled={togglingId === job.id}
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
                    job.status === 'PUBLISHED'
                      ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                      : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                  }`}
                >
                  {togglingId === job.id ? '...' : job.status === 'PUBLISHED' ? 'Archive' : 'Publish'}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* AI Rankings Section */}
      <section>
        <h2 className="mb-3 text-xl font-semibold">AI Rankings</h2>
        {(data?.aiRankings ?? []).length === 0 ? (
          <p className="text-sm text-slate-500">No applicants yet. Rankings will appear once candidates apply to your jobs.</p>
        ) : (
          <div className="grid gap-3">
            {(data?.aiRankings ?? []).map((app: {
              id: string;
              matchScore: number | null;
              status: string;
              candidate: {
                userId: string;
                user: {
                  email: string;
                  resumeFile?: { id: string } | null;
                };
              };
              job: { title: string };
            }) => (
              <div key={app.id} className="flex items-center justify-between gap-4 rounded-lg border border-slate-800 bg-slate-900 p-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-slate-200">{app.candidate.user.email}</p>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      app.status === 'SHORTLISTED'
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : app.status === 'REJECTED'
                        ? 'bg-rose-500/15 text-rose-400'
                        : 'bg-slate-500/15 text-slate-400'
                    }`}>
                      {app.status}
                    </span>
                  </div>
                  <p className="text-sm text-slate-400">
                    {app.job.title} · Match Score: <span className="font-semibold text-emerald-400">{app.matchScore !== null ? `${app.matchScore}%` : 'N/A'}</span>
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {app.candidate.user.resumeFile ? (
                    <a
                      href={`http://localhost:3000/api/resumes/${app.candidate.userId}/download?token=${localStorage.getItem('accessToken')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg bg-slate-800 border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-slate-100 hover:border-slate-600 transition-colors"
                    >
                      View Resume
                    </a>
                  ) : (
                    <span className="text-xs text-slate-500 italic">No resume</span>
                  )}

                  {app.status === 'APPLIED' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUpdateApplicationStatus(app.id, 'SHORTLISTED')}
                        disabled={updatingAppId !== null}
                        className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition-colors disabled:opacity-50"
                      >
                        Shortlist
                      </button>
                      <button
                        onClick={() => handleUpdateApplicationStatus(app.id, 'REJECTED')}
                        disabled={updatingAppId !== null}
                        className="rounded-lg bg-rose-500/10 border border-rose-500/30 px-3 py-1.5 text-xs font-bold text-rose-400 hover:bg-rose-500/20 transition-colors disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
