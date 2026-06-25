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
    <div className="space-y-8 max-w-4xl mx-auto py-6">
      <div className="space-y-2">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-100">Find Your Next Role</h1>
        <p className="text-sm text-slate-400">Search conceptually using AI embeddings or list matching postings</p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder='Try "remote react developer" or "python data engineer"...'
          className="flex-1 rounded-xl border border-slate-800 bg-[#090b14]/50 px-4 py-3 text-sm focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 text-slate-200 transition-all placeholder:text-slate-600"
        />
        <button
          type="submit"
          className="btn-premium-violet px-6 py-3 text-sm"
        >
          🔍 Search
        </button>
      </form>

      {isLoading && (
        <div className="flex flex-col items-center justify-center py-16 space-y-3">
          <div className="h-8 w-8 rounded-full border-2 border-violet-500/30 border-t-violet-500 animate-spin" />
          <p className="text-slate-400 text-sm">Searching jobs...</p>
        </div>
      )}

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
          <article key={job.id} className="premium-card rounded-2xl p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1.5">
                <h2 className="text-xl font-bold text-slate-100 tracking-tight">{job.title}</h2>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  <span className="font-semibold text-slate-200">{job.company?.name ?? 'Company'}</span>
                  <span>•</span>
                  <span>{job.location}</span>
                  {job.remoteStatus && (
                    <>
                      <span>•</span>
                      <span className="rounded-md bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 text-xs text-cyan-400 font-medium">
                        Remote
                      </span>
                    </>
                  )}
                </div>
                <p className="text-xs text-slate-500 font-medium">
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
                  className={`shrink-0 text-xs px-4 py-2 ${
                    applyMsg?.id === job.id && applyMsg.ok
                      ? 'rounded-xl bg-slate-800 border border-slate-700 text-slate-400 cursor-not-allowed font-medium'
                      : 'btn-premium-violet'
                  }`}
                >
                  {applyingJobId === job.id
                    ? 'Applying...'
                    : applyMsg?.id === job.id && applyMsg.ok
                    ? '✓ Applied'
                    : 'Apply Now'}
                </button>
              )}
            </div>
            
            <p className="text-sm text-slate-300 line-clamp-2 leading-relaxed font-light">{job.description}</p>
            
            {applyMsg?.id === job.id && (
              <p className={`text-xs font-semibold ${applyMsg.ok ? 'text-cyan-400' : 'text-rose-400'}`}>
                {applyMsg.msg}
              </p>
            )}
          </article>
        ))}

        {!isLoading && (data?.data ?? []).length === 0 && (
          <div className="text-center py-16 rounded-2xl border border-dashed border-slate-800 bg-[#090b14]/15">
            <p className="text-4xl mb-3">🔍</p>
            <p className="text-slate-400 text-sm">No jobs found. Try different search terms or clear search filter.</p>
          </div>
        )}
      </div>
    </div>
  );
}
