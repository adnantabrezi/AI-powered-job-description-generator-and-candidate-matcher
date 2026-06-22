import { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { dashboardApi, resumeApi, profileApi } from '../../services/api';

export default function CandidateDashboard() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => (await profileApi.me()).data,
  });

  const { data: resume } = useQuery({
    queryKey: ['resume'],
    queryFn: async () => {
      try {
        return (await resumeApi.get()).data;
      } catch {
        return null;
      }
    },
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard-candidate'],
    queryFn: async () => (await dashboardApi.candidate()).data,
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadMsg('');
    try {
      await resumeApi.upload(file);
      setUploadMsg('Resume uploaded! AI is analyzing your skills...');
      queryClient.invalidateQueries({ queryKey: ['resume'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-candidate'] });
    } catch (err: any) {
      setUploadMsg(err.response?.data?.error || 'Upload failed. Use PDF or DOCX under 10MB.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteResume = async () => {
    try {
      await resumeApi.delete();
      setUploadMsg('Resume deleted.');
      queryClient.invalidateQueries({ queryKey: ['resume'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-candidate'] });
    } catch {
      setUploadMsg('Failed to delete resume.');
    }
  };

  if (isLoading) return <p className="text-slate-400">Loading dashboard...</p>;
  if (error) return <p className="text-red-400">Unable to load candidate dashboard.</p>;

  const candidateProfile = profile?.user?.candidateProfile;

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-slate-100">Candidate Dashboard</h1>

      {/* Profile Overview */}
      <section className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-3">
        <h2 className="text-lg font-semibold text-emerald-400">Your Profile</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-slate-500 uppercase text-xs font-semibold">Name</span>
            <p className="text-slate-200">{candidateProfile?.fullName ?? 'Not set'}</p>
          </div>
          <div>
            <span className="text-slate-500 uppercase text-xs font-semibold">Email</span>
            <p className="text-slate-200">{profile?.user?.email ?? '—'}</p>
          </div>
          <div>
            <span className="text-slate-500 uppercase text-xs font-semibold">Experience</span>
            <p className="text-slate-200">{candidateProfile?.experienceYears ?? 0} years</p>
          </div>
          <div>
            <span className="text-slate-500 uppercase text-xs font-semibold">Bio</span>
            <p className="text-slate-200">{candidateProfile?.bio || 'No bio added'}</p>
          </div>
        </div>
      </section>

      {/* Resume Upload */}
      <section className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-emerald-400">Resume</h2>
          {resume && (
            <button
              onClick={handleDeleteResume}
              className="text-xs text-rose-400 hover:text-rose-300 transition-colors"
            >
              Delete Resume
            </button>
          )}
        </div>

        {resume ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-400"></span>
              <p className="text-sm text-slate-300">
                Resume uploaded · AI has extracted your skills
              </p>
            </div>
            <p className="text-xs text-slate-500">
              Uploaded: {new Date(resume.createdAt).toLocaleDateString()}
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-lg border-2 border-dashed border-slate-700 p-8 text-center">
            <p className="text-slate-400 text-sm">
              Upload your resume (PDF or DOCX) so AI can match you to the best jobs
            </p>
            <label className="cursor-pointer rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 transition-colors">
              {uploading ? 'Uploading...' : 'Choose File'}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx"
                className="hidden"
                onChange={handleUpload}
                disabled={uploading}
              />
            </label>
          </div>
        )}

        {/* Re-upload option when resume exists */}
        {resume && (
          <label className="inline-block cursor-pointer rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:border-emerald-500 transition-colors">
            {uploading ? 'Uploading...' : 'Re-upload Resume'}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx"
              className="hidden"
              onChange={handleUpload}
              disabled={uploading}
            />
          </label>
        )}

        {uploadMsg && (
          <p className={`text-sm ${uploadMsg.includes('fail') || uploadMsg.includes('Failed') ? 'text-rose-400' : 'text-emerald-400'}`}>
            {uploadMsg}
          </p>
        )}
      </section>

      {/* Recommended Jobs */}
      <section>
        <h2 className="mb-3 text-xl font-semibold">Recommended Jobs</h2>
        {(data?.recommendedJobs ?? []).length === 0 ? (
          <p className="text-sm text-slate-500">
            {resume
              ? 'No matches yet. Check back once employers publish jobs!'
              : 'Upload your resume above to get AI-powered job recommendations.'}
          </p>
        ) : (
          <div className="grid gap-3">
            {(data?.recommendedJobs ?? []).map((match: {
              id: string;
              matchScore: number;
              job: { title: string; company: { name: string } };
            }) => (
              <div key={match.id} className="rounded-lg border border-slate-800 bg-slate-900 p-4 hover:border-slate-700 transition-colors">
                <p className="font-medium">{match.job.title}</p>
                <p className="text-sm text-slate-400">
                  {match.job.company.name} · Match {Math.round(match.matchScore)}%
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recent Applications */}
      <section>
        <h2 className="mb-3 text-xl font-semibold">Recent Applications</h2>
        {(data?.recentApplications ?? []).length === 0 ? (
          <p className="text-sm text-slate-500">
            You haven't applied to any jobs yet. Browse jobs and start applying!
          </p>
        ) : (
          <div className="grid gap-3">
            {(data?.recentApplications ?? []).map((app: {
              id: string;
              status: string;
              job: { title: string };
            }) => (
              <div key={app.id} className="rounded-lg border border-slate-800 bg-slate-900 p-4 hover:border-slate-700 transition-colors">
                <p>{app.job.title}</p>
                <p className="text-sm text-emerald-400">{app.status.replace(/_/g, ' ')}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
