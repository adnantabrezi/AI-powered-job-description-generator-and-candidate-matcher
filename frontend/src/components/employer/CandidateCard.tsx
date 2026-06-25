import { useState } from 'react';
import { candidateSummaryApi } from '../../services/api';

interface Props {
  application: {
    id: string;
    matchScore: number | null;
    status: string;
    matchedSkills?: string[];
    missingSkills?: string[];
    candidate: {
      id: string;
      userId: string;
      fullName?: string;
      user: { email: string; resumeFile?: { id: string } | null };
    };
    job: { id: string; title: string };
  };
  onStatusUpdate: (appId: string, status: string) => void;
  onAddToPipeline?: (candidateId: string) => void;
  isUpdating: boolean;
}

export default function CandidateCard({ application: app, onStatusUpdate, onAddToPipeline, isUpdating }: Props) {
  const [summary, setSummary] = useState<any>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  const handleGenerateSummary = async () => {
    setLoadingSummary(true);
    try {
      const res = await candidateSummaryApi.generate(app.candidate.id, app.job.id);
      setSummary(res.data);
    } catch {
      setSummary({ whyThisCandidate: 'Failed to generate summary.', strengthHighlights: [], concerns: [] });
    } finally {
      setLoadingSummary(false);
    }
  };

  const scoreColor = (score: number | null) => {
    if (!score) return 'text-slate-500';
    if (score >= 70) return 'text-emerald-400';
    if (score >= 40) return 'text-amber-400';
    return 'text-rose-400';
  };

  const scoreRingColor = (score: number | null) => {
    if (!score) return 'stroke-slate-700';
    if (score >= 70) return 'stroke-emerald-500';
    if (score >= 40) return 'stroke-amber-500';
    return 'stroke-rose-500';
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-3 hover:border-slate-700 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* Score ring */}
          <div className="relative h-12 w-12 shrink-0">
            <svg className="h-12 w-12 -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-800" />
              <circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="2.5" strokeLinecap="round"
                className={scoreRingColor(app.matchScore)}
                strokeDasharray={`${(app.matchScore || 0) * 0.975} 97.5`} />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-xs font-bold ${scoreColor(app.matchScore)}`}>
                {app.matchScore !== null ? Math.round(app.matchScore) : '?'}
              </span>
            </div>
          </div>

          <div>
            <p className="font-medium text-slate-200">{app.candidate.fullName || app.candidate.user.email}</p>
            <p className="text-xs text-slate-500">{app.candidate.user.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                app.status === 'SHORTLISTED' ? 'bg-emerald-500/15 text-emerald-400'
                : app.status === 'REJECTED' ? 'bg-rose-500/15 text-rose-400'
                : app.status === 'HIRED' ? 'bg-indigo-500/15 text-indigo-400'
                : 'bg-slate-500/15 text-slate-400'
              }`}>
                {app.status.replace(/_/g, ' ')}
              </span>
              <span className="text-xs text-slate-600">for {app.job.title}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {app.candidate.user.resumeFile && (
            <a href={`http://localhost:3000/api/resumes/${app.candidate.userId}/download?token=${localStorage.getItem('accessToken')}`}
              target="_blank" rel="noopener noreferrer"
              className="rounded-lg bg-slate-800 border border-slate-700 px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-slate-100 hover:border-slate-600 transition-colors">
              📄 Resume
            </a>
          )}
          {onAddToPipeline && (
            <button onClick={() => onAddToPipeline(app.candidate.id)}
              className="rounded-lg bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1.5 text-xs font-semibold text-indigo-400 hover:bg-indigo-500/20 transition-colors">
              + Pipeline
            </button>
          )}
        </div>
      </div>

      {/* Skill tags */}
      {(app.matchedSkills || app.missingSkills) && (
        <div className="flex flex-wrap gap-1">
          {(app.matchedSkills || []).map((s) => (
            <span key={s} className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400">✓ {s}</span>
          ))}
          {(app.missingSkills || []).slice(0, 3).map((s) => (
            <span key={s} className="rounded-full bg-rose-500/10 px-2 py-0.5 text-xs text-rose-400">✗ {s}</span>
          ))}
        </div>
      )}

      {/* "Why this candidate" summary */}
      {!summary && (
        <button onClick={handleGenerateSummary} disabled={loadingSummary}
          className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors font-medium disabled:opacity-50">
          {loadingSummary ? '✨ Generating summary...' : '✨ Why this candidate?'}
        </button>
      )}
      {summary && (
        <div className="rounded-lg bg-slate-950/50 border border-slate-800 p-3 space-y-2">
          <p className="text-xs text-slate-300 leading-relaxed">{summary.whyThisCandidate}</p>
          {summary.strengthHighlights?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {summary.strengthHighlights.map((s: string, i: number) => (
                <span key={i} className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400">💪 {s}</span>
              ))}
            </div>
          )}
          {summary.concerns?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {summary.concerns.map((c: string, i: number) => (
                <span key={i} className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs text-amber-400">⚠️ {c}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Status actions */}
      {app.status === 'APPLIED' && (
        <div className="flex gap-2 pt-1">
          <button onClick={() => onStatusUpdate(app.id, 'SHORTLISTED')} disabled={isUpdating}
            className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition-colors disabled:opacity-50">
            Shortlist
          </button>
          <button onClick={() => onStatusUpdate(app.id, 'REJECTED')} disabled={isUpdating}
            className="rounded-lg bg-rose-500/10 border border-rose-500/30 px-3 py-1.5 text-xs font-bold text-rose-400 hover:bg-rose-500/20 transition-colors disabled:opacity-50">
            Reject
          </button>
        </div>
      )}
    </div>
  );
}
