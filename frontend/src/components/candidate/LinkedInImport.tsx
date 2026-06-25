import { useState } from 'react';
import { linkedInApi } from '../../services/api';

interface Props {
  onSuccess: () => void;
}

export default function LinkedInImport({ onSuccess }: Props) {
  const [profileText, setProfileText] = useState('');
  const [linkedInUrl, setLinkedInUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleParse = async () => {
    if (!profileText.trim()) return;
    setIsProcessing(true);
    setError('');
    setResult(null);

    try {
      const res = await linkedInApi.parseProfile(profileText, linkedInUrl || undefined);
      setResult(res.data);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to parse LinkedIn profile');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-lg">🔗</span>
        <h3 className="text-sm font-semibold text-indigo-400">Import LinkedIn Profile</h3>
      </div>

      <p className="text-xs text-slate-400">
        Paste your LinkedIn profile content below. AI will extract your skills, experience, and education to enhance your profile and improve job matching.
      </p>

      <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">LinkedIn URL <span className="text-slate-600 normal-case">(optional)</span></label>
        <input type="url" value={linkedInUrl} onChange={(e) => setLinkedInUrl(e.target.value)}
          placeholder="https://linkedin.com/in/yourprofile"
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Profile Content *</label>
        <textarea rows={6} value={profileText} onChange={(e) => setProfileText(e.target.value)}
          placeholder="Copy and paste your full LinkedIn profile text here...&#10;&#10;Include your headline, about section, experience, education, and skills."
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
      </div>

      {error && <p className="text-xs text-rose-400">{error}</p>}

      <button onClick={handleParse} disabled={isProcessing || !profileText.trim()}
        className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-400 transition-colors disabled:opacity-40 flex items-center gap-2">
        {isProcessing ? (
          <>
            <div className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            Processing...
          </>
        ) : '✨ Import with AI'}
      </button>

      {result && (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-3">
          <p className="text-sm font-semibold text-emerald-400">✓ Profile data imported successfully!</p>
          <div className="grid grid-cols-2 gap-3 text-xs text-slate-300">
            {result.extracted?.fullName && (
              <div><span className="text-slate-500">Name:</span> {result.extracted.fullName}</div>
            )}
            {result.extracted?.headline && (
              <div><span className="text-slate-500">Headline:</span> {result.extracted.headline}</div>
            )}
            {result.extracted?.skills?.length > 0 && (
              <div className="col-span-2">
                <span className="text-slate-500">Skills extracted: </span>
                <span className="text-emerald-400">{result.extracted.skills.length} skills</span>
              </div>
            )}
            {result.extracted?.experience?.length > 0 && (
              <div className="col-span-2">
                <span className="text-slate-500">Experience: </span>
                <span className="text-indigo-400">{result.extracted.experience.length} positions</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
