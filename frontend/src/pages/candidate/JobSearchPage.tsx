import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { jobsApi, applicationsApi } from '../../services/api';

export default function JobSearchPage() {
  const [query, setQuery] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [applyingJobId, setApplyingJobId] = useState<string | null>(null);
  const [applyMsg, setApplyMsg] = useState<{ id: string; msg: string; ok: boolean } | null>(null);

  const token = localStorage.getItem('accessToken');
  const userRole = localStorage.getItem('userRole');
  const isCandidate = !!token && userRole === 'CANDIDATE';

  const { data, isLoading } = useQuery({
    queryKey: ['jobs', searchTerm],
    queryFn: async () => {
      const response = searchTerm
        ? await jobsApi.search(searchTerm)
        : await jobsApi.list();
      return response.data;
    },
  });

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSearchTerm(query);
  };

  const handleApply = async (jobId: string) => {
    setApplyingJobId(jobId);
    setApplyMsg(null);
    try {
      await applicationsApi.apply(jobId);
      setApplyMsg({ id: jobId, msg: 'Applied successfully!', ok: true });
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to apply';
      setApplyMsg({ id: jobId, msg, ok: false });
    } finally {
      setApplyingJobId(null);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Job Search</h1>
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder='Try "remote react developer"'
          className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2"
        />
        <button
          type="submit"
          className="rounded-lg bg-emerald-500 px-4 py-2 font-medium text-slate-950"
        >
          Search
        </button>
      </form>
      {isLoading && <p className="text-slate-400">Loading jobs...</p>}
      <div className="grid gap-4">
        {(data?.data ?? []).map((job: {
          id: string;
          title: string;
          description: string;
          location: string;
          employmentType: string;
          remoteStatus: boolean;
          salaryMin?: number;
          salaryMax?: number;
          company?: { name: string };
        }) => (
          <article key={job.id} className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-3 hover:border-slate-700 transition-colors">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold">{job.title}</h2>
                <p className="text-slate-400 text-sm">
                  {job.company?.name ?? 'Company'} · {job.location}
                  {job.remoteStatus && <span className="ml-2 text-emerald-400">Remote</span>}
                </p>
                <p className="text-xs text-slate-500">
                  {job.employmentType}
                  {(job.salaryMin || job.salaryMax) && (
                    <span>
                      {' · '}
                      {job.salaryMin ? `$${Number(job.salaryMin).toLocaleString()}` : ''}
                      {job.salaryMin && job.salaryMax ? ' – ' : ''}
                      {job.salaryMax ? `$${Number(job.salaryMax).toLocaleString()}` : ''}
                    </span>
                  )}
                </p>
              </div>
              {isCandidate && (
                <button
                  onClick={() => handleApply(job.id)}
                  disabled={applyingJobId === job.id || (applyMsg?.id === job.id && applyMsg.ok)}
                  className="shrink-0 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 transition-colors disabled:opacity-50"
                >
                  {applyingJobId === job.id
                    ? 'Applying...'
                    : applyMsg?.id === job.id && applyMsg.ok
                    ? '✓ Applied'
                    : 'Apply'}
                </button>
              )}
            </div>
            <p className="text-sm text-slate-400 line-clamp-2">{job.description}</p>
            {applyMsg?.id === job.id && (
              <p className={`text-xs ${applyMsg.ok ? 'text-emerald-400' : 'text-rose-400'}`}>
                {applyMsg.msg}
              </p>
            )}
          </article>
        ))}
        {!isLoading && (data?.data ?? []).length === 0 && (
          <p className="text-slate-500 text-center py-8">No jobs found. Try a different search term.</p>
        )}
      </div>
    </div>
  );
}
