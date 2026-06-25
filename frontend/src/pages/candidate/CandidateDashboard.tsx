import { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { dashboardApi, resumeApi, profileApi } from '../../services/api';
import LinkedInImport from '../../components/candidate/LinkedInImport';

export default function CandidateDashboard() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  const [showLinkedIn, setShowLinkedIn] = useState(false);

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
      setUploadMsg('Resume uploaded! AI is extracting and analyzing your skills...');
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

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center py-24 space-y-3">
      <div className="h-8 w-8 rounded-full border-2 border-violet-500/30 border-t-violet-500 animate-spin" />
      <p className="text-slate-400 text-sm">Loading dashboard...</p>
    </div>
  );
  if (error) return <p className="text-rose-400 bg-rose-500/10 p-4 rounded-xl">Unable to load candidate dashboard.</p>;

  const candidateProfile = profile?.user?.candidateProfile;

  return (
    <div className="space-y-8 max-w-4xl mx-auto py-4">
      <div className="space-y-1">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-100">Candidate Dashboard</h1>
        <p className="text-sm text-slate-400 font-light">Optimize your profile, manage your resume, and browse matching positions</p>
      </div>

      {/* Profile Overview */}
      <section className="premium-card rounded-2xl p-6 space-y-4">
        <h2 className="text-lg font-bold text-violet-400">Your Profile</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-slate-500 uppercase text-[10px] font-bold tracking-wider">Name</span>
            <p className="text-slate-200 mt-0.5">{candidateProfile?.fullName ?? 'Not set'}</p>
          </div>
          <div>
            <span className="text-slate-500 uppercase text-[10px] font-bold tracking-wider">Email</span>
            <p className="text-slate-200 mt-0.5">{profile?.user?.email ?? '—'}</p>
          </div>
          <div>
            <span className="text-slate-500 uppercase text-[10px] font-bold tracking-wider">Experience</span>
            <p className="text-slate-200 mt-0.5">{candidateProfile?.experienceYears ?? 0} years</p>
          </div>
          <div>
            <span className="text-slate-500 uppercase text-[10px] font-bold tracking-wider">Headline</span>
            <p className="text-slate-200 mt-0.5">{candidateProfile?.headline || candidateProfile?.bio || 'No headline set'}</p>
          </div>
        </div>

        {/* Skills display */}
        {candidateProfile?.skills?.length > 0 && (
          <div className="pt-2">
            <span className="text-slate-500 uppercase text-[10px] font-bold tracking-wider">Skills</span>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {candidateProfile.skills.map((cs: any) => (
                <span key={cs.skill.id} className="rounded-lg bg-violet-500/10 border border-violet-500/20 px-2.5 py-1 text-xs text-violet-400 font-semibold">
                  {cs.skill.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Resume Upload */}
      <section className="premium-card rounded-2xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-violet-400">Resume</h2>
          {resume && (
            <button
              onClick={handleDeleteResume}
              className="text-xs text-rose-400 hover:text-rose-300 font-semibold transition-colors"
            >
              Delete Resume
            </button>
          )}
        </div>

        {resume ? (
          <div className="space-y-3 bg-[#090b14]/25 p-4 rounded-xl border border-slate-900/60">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-violet-400 animate-pulse"></span>
              <p className="text-sm text-slate-300 font-medium">
                Resume uploaded & processed
              </p>
            </div>
            <p className="text-xs text-slate-500">
              Uploaded on: {new Date(resume.createdAt).toLocaleDateString()}
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 rounded-xl border-2 border-dashed border-slate-800 bg-[#090b14]/20 p-8 text-center hover:border-violet-500/20 transition-all">
            <p className="text-slate-400 text-sm max-w-sm">
              Upload your resume (PDF or DOCX) so local AI can match your skills directly to open positions.
            </p>
            <label className="btn-premium-violet text-xs px-5 py-2.5 cursor-pointer">
              {uploading ? 'Uploading...' : 'Choose Resume File'}
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

        {resume && (
          <label className="btn-premium-outline px-4 py-2 text-xs cursor-pointer inline-block">
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
          <p className={`text-xs font-semibold ${uploadMsg.includes('fail') || uploadMsg.includes('Failed') ? 'text-rose-400' : 'text-cyan-400'}`}>
            {uploadMsg}
          </p>
        )}
      </section>

      {/* LinkedIn Import */}
      <section className="space-y-2">
        <button onClick={() => setShowLinkedIn(!showLinkedIn)}
          className="flex items-center gap-2 text-sm font-bold text-pink-400 hover:text-pink-300 transition-colors">
          🔗 {showLinkedIn ? 'Hide' : 'Import'} LinkedIn Profile Data
        </button>
        {showLinkedIn && (
          <LinkedInImport onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['profile'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-candidate'] });
          }} />
        )}
      </section>

      {/* Recommended Jobs */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-slate-100">Recommended Jobs</h2>
        {(data?.recommendedJobs ?? []).length === 0 ? (
          <div className="text-center py-12 border border-dashed border-slate-800 bg-[#090b14]/10 rounded-xl">
            <p className="text-slate-500 text-sm">
              {resume
                ? 'No matches yet. Open roles will appear once employers publish them!'
                : 'Upload your resume above to receive AI-powered compatibility match recommendations.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {(data?.recommendedJobs ?? []).map((match: any) => (
              <div key={match.id} className="premium-card rounded-2xl p-5 space-y-3.5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-bold text-slate-100 text-lg tracking-tight">{match.job.title}</p>
                    <p className="text-xs text-slate-400 font-medium">
                      {match.job.company.name} · Compatibility Match <span className="font-bold text-violet-400">{Math.round(match.matchScore)}%</span>
                    </p>
                  </div>
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-xs font-bold border transition-all ${
                    match.matchScore >= 70 ? 'bg-violet-500/10 text-violet-400 border-violet-500/25 shadow-[0_0_10px_rgba(139,92,246,0.15)]' :
                    match.matchScore >= 40 ? 'bg-pink-500/10 text-pink-400 border-pink-500/25 shadow-[0_0_10px_rgba(217,70,239,0.05)]' :
                    'bg-slate-900 text-slate-500 border-slate-800'
                  }`}>
                    {Math.round(match.matchScore)}
                  </div>
                </div>

                {/* Match details */}
                {match.whyThisCandidate && (
                  <p className="text-xs text-slate-400 leading-relaxed font-light bg-[#090b14]/15 p-3 rounded-xl border border-slate-900/40">{match.whyThisCandidate}</p>
                )}

                {(match.matchedSkills?.length > 0 || match.missingSkills?.length > 0) && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {(match.matchedSkills || []).slice(0, 6).map((s: string) => (
                      <span key={s} className="rounded-lg bg-violet-500/10 border border-violet-500/20 px-2.5 py-0.5 text-xs text-violet-400 font-semibold">✓ {s}</span>
                    ))}
                    {(match.missingSkills || []).slice(0, 4).map((s: string) => (
                      <span key={s} className="rounded-lg bg-rose-500/10 border border-rose-500/20 px-2.5 py-0.5 text-xs text-rose-400 font-semibold">✗ {s}</span>
                    ))}
                  </div>
                )}

                {match.strengthHighlights?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {match.strengthHighlights.map((s: string, i: number) => (
                      <span key={i} className="rounded-lg bg-pink-500/10 border border-pink-500/20 px-2.5 py-0.5 text-xs text-pink-400 font-semibold">💪 {s}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recent Applications */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-slate-100">Recent Applications</h2>
        {(data?.recentApplications ?? []).length === 0 ? (
          <p className="text-sm text-slate-500">
            You haven't applied to any jobs yet. Browse listings to start applying!
          </p>
        ) : (
          <div className="grid gap-4">
            {(data?.recentApplications ?? []).map((app: any) => (
              <div key={app.id} className="premium-card rounded-2xl p-4 flex items-center justify-between hover:border-violet-500/30 transition-colors">
                <p className="font-bold text-slate-200">{app.job.title}</p>
                <span className="rounded-md border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-1 text-xs font-bold text-cyan-400 uppercase tracking-wider">
                  {app.status.replace(/_/g, ' ')}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
