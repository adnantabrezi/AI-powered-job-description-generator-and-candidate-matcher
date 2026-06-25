import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi, jobsApi, applicationsApi } from '../../services/api';
import JobCreatorWizard from '../../components/employer/JobCreatorWizard';
import CandidateCard from '../../components/employer/CandidateCard';
import InterviewQuestions from '../../components/employer/InterviewQuestions';
import ExportModal from '../../components/employer/ExportModal';
import PipelineManager from '../../components/employer/PipelineManager';

type Tab = 'jobs' | 'candidates' | 'pipelines';

export default function EmployerDashboard() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard-employer'],
    queryFn: async () => (await dashboardApi.employer()).data,
  });

  const [activeTab, setActiveTab] = useState<Tab>('jobs');
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [exportJob, setExportJob] = useState<{ id: string; title: string } | null>(null);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
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
      PUBLISHED: 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-400',
      DRAFT: 'bg-amber-500/10 border border-amber-500/20 text-amber-400',
      ARCHIVED: 'bg-slate-800 border border-slate-700 text-slate-400',
    };
    return (
      <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${colors[status] ?? colors.DRAFT}`}>
        {status}
      </span>
    );
  };

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center py-24 space-y-3">
      <div className="h-8 w-8 rounded-full border-2 border-violet-500/30 border-t-violet-500 animate-spin" />
      <p className="text-slate-400 text-sm">Loading employer dashboard...</p>
    </div>
  );
  if (error) return <p className="text-rose-400 bg-rose-500/10 p-4 rounded-xl">Unable to load employer dashboard.</p>;

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'jobs', label: 'Jobs', icon: '💼' },
    { key: 'candidates', label: 'AI Rankings', icon: '✨' },
    { key: 'pipelines', label: 'Pipelines', icon: '🔄' },
  ];

  return (
    <div className="space-y-8 py-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-100">Employer Dashboard</h1>
          <p className="text-sm text-slate-400">Manage job postings, candidates, and AI talent pipelines</p>
        </div>
        <button
          onClick={() => setIsWizardOpen(true)}
          className="btn-premium-violet flex items-center gap-2 text-sm"
        >
          ✨ AI Job Creator
        </button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="premium-card rounded-2xl p-5 text-center">
          <p className="text-3xl font-extrabold text-violet-400">{(data?.activeJobs ?? []).length}</p>
          <p className="text-xs uppercase tracking-wider text-slate-500 font-bold mt-1.5">Active Jobs</p>
        </div>
        <div className="premium-card rounded-2xl p-5 text-center">
          <p className="text-3xl font-extrabold text-pink-400">{(data?.applicants ?? []).length}</p>
          <p className="text-xs uppercase tracking-wider text-slate-500 font-bold mt-1.5">Applicants</p>
        </div>
        <div className="premium-card rounded-2xl p-5 text-center">
          <p className="text-3xl font-extrabold text-cyan-400">
            {(data?.hiringAnalytics ?? []).find((a: any) => a.status === 'SHORTLISTED')?._count?.status || 0}
          </p>
          <p className="text-xs uppercase tracking-wider text-slate-500 font-bold mt-1.5">Shortlisted</p>
        </div>
        <div className="premium-card rounded-2xl p-5 text-center">
          <p className="text-3xl font-extrabold text-emerald-400">
            {(data?.hiringAnalytics ?? []).find((a: any) => a.status === 'HIRED')?._count?.status || 0}
          </p>
          <p className="text-xs uppercase tracking-wider text-slate-500 font-bold mt-1.5">Hired</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 border-b border-slate-800/80 pb-px">
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-3 text-sm font-semibold transition-colors border-b-2 -mb-px flex items-center gap-2 ${
              activeTab === tab.key
                ? 'border-violet-500 text-violet-400 bg-violet-500/5 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-300 hover:border-slate-800'
            }`}>
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Jobs tab */}
      {activeTab === 'jobs' && (
        <section className="space-y-4">
          {(data?.activeJobs ?? []).length === 0 ? (
            <div className="text-center py-16 border border-dashed border-slate-800 bg-[#090b14]/15 rounded-2xl space-y-4">
              <p className="text-5xl">✨</p>
              <p className="text-slate-400 text-sm">No job postings created yet.</p>
              <button onClick={() => setIsWizardOpen(true)}
                className="btn-premium-violet text-sm">
                Create First AI Job Posting
              </button>
            </div>
          ) : (
            (data?.activeJobs ?? []).map((job: any) => (
              <div key={job.id} className="premium-card rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <p className="font-bold text-slate-100 text-lg tracking-tight">{job.title}</p>
                      {statusBadge(job.status)}
                    </div>
                    <p className="text-xs text-slate-400 font-medium">{job._count.applications} applicants</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setExportJob({ id: job.id, title: job.title })}
                      className="btn-premium-outline px-3 py-1.5 text-xs">
                      📤 Export
                    </button>
                    <button
                      onClick={() => setExpandedJobId(expandedJobId === job.id ? null : job.id)}
                      className="rounded-xl bg-purple-500/10 border border-purple-500/20 px-3.5 py-1.5 text-xs font-semibold text-purple-400 hover:bg-purple-500/20 transition-all hover:-translate-y-0.5">
                      📋 Interview Q's
                    </button>
                    <button
                      onClick={() => handleToggleStatus(job.id, job.status)}
                      disabled={togglingId === job.id}
                      className={`shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all hover:-translate-y-0.5 disabled:opacity-50 ${
                        job.status === 'PUBLISHED'
                          ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20'
                          : 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20'
                      }`}>
                      {togglingId === job.id ? '...' : job.status === 'PUBLISHED' ? 'Archive' : 'Publish'}
                    </button>
                  </div>
                </div>

                {/* Expandable interview questions */}
                {expandedJobId === job.id && (
                  <div className="border-t border-slate-800/80 pt-4 mt-2">
                    <InterviewQuestions jobId={job.id} jobTitle={job.title} />
                  </div>
                )}
              </div>
            ))
          )}
        </section>
      )}

      {/* Candidates tab */}
      {activeTab === 'candidates' && (
        <section className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-slate-100">AI-Ranked Candidates</h2>
            <p className="text-xs text-slate-400">Applications ranked contextually against posted job specifications</p>
          </div>
          {(data?.aiRankings ?? []).length === 0 ? (
            <div className="text-center py-16 border border-dashed border-slate-800 bg-[#090b14]/15 rounded-2xl">
              <p className="text-slate-400 text-sm">No applicants yet. Rankings will appear once candidates apply.</p>
            </div>
          ) : (
            (data?.aiRankings ?? []).map((app: any) => (
              <CandidateCard
                key={app.id}
                application={app}
                onStatusUpdate={handleUpdateApplicationStatus}
                isUpdating={updatingAppId !== null}
              />
            ))
          )}
        </section>
      )}

      {/* Pipelines tab */}
      {activeTab === 'pipelines' && <PipelineManager />}

      {/* Modals */}
      {isWizardOpen && (
        <JobCreatorWizard
          onJobCreated={refetch}
          onClose={() => setIsWizardOpen(false)}
        />
      )}

      {exportJob && (
        <ExportModal
          jobId={exportJob.id}
          jobTitle={exportJob.title}
          onClose={() => setExportJob(null)}
        />
      )}
    </div>
  );
}
