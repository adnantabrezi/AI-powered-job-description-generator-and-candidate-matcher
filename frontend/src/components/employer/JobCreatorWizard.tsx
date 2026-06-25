import { useState } from 'react';
import { jdGenerationApi } from '../../services/api';

interface Props {
  onJobCreated: () => void;
  onClose: () => void;
}

type Step = 'input' | 'generating' | 'review' | 'salary' | 'publish';

export default function JobCreatorWizard({ onJobCreated, onClose }: Props) {
  const [step, setStep] = useState<Step>('input');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: Input
  const [title, setTitle] = useState('');
  const [responsibilities, setResponsibilities] = useState('');
  const [requiredSkills, setRequiredSkills] = useState('');
  const [companyCulture, setCompanyCulture] = useState('');
  const [employmentType, setEmploymentType] = useState('Full-time');
  const [location, setLocation] = useState('');
  const [remoteStatus, setRemoteStatus] = useState(false);
  const [requiredExperience, setRequiredExperience] = useState('');
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');

  // Generated data
  const [generated, setGenerated] = useState<any>(null);
  const [editedDescription, setEditedDescription] = useState('');
  const [reviewMode, setReviewMode] = useState<'edit' | 'preview'>('preview');
  const [salaryAnalysis, setSalaryAnalysis] = useState<any>(null);

  const handleGenerate = async () => {
    setError('');
    setStep('generating');

    try {
      const input = {
        title,
        responsibilities: responsibilities.split('\n').filter((r) => r.trim()),
        requiredSkills: requiredSkills.split(',').map((s) => s.trim()).filter(Boolean),
        companyCulture: companyCulture || undefined,
        employmentType,
        location: location || undefined,
        remoteStatus,
        requiredExperience: requiredExperience ? Number(requiredExperience) : undefined,
        salaryMin: salaryMin ? Number(salaryMin) : undefined,
        salaryMax: salaryMax ? Number(salaryMax) : undefined,
      };

      const res = await jdGenerationApi.generateDescription(input);
      setGenerated(res.data);
      setEditedDescription(res.data.generatedDescription);
      setStep('review');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to generate description');
      setStep('input');
    }
  };

  const handleAnalyzeSalary = async () => {
    try {
      const res = await jdGenerationApi.analyzeSalary({
        title,
        location: location || 'United States',
        skills: requiredSkills.split(',').map((s) => s.trim()).filter(Boolean),
        experienceYears: requiredExperience ? Number(requiredExperience) : undefined,
        salaryMin: salaryMin ? Number(salaryMin) : undefined,
        salaryMax: salaryMax ? Number(salaryMax) : undefined,
      });
      setSalaryAnalysis(res.data);
      setStep('salary');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to analyze salary');
    }
  };

  const handlePublish = async () => {
    setIsSubmitting(true);
    setError('');

    try {
      await jdGenerationApi.createWithAI({
        title,
        responsibilities: responsibilities.split('\n').filter((r) => r.trim()),
        requiredSkills: requiredSkills.split(',').map((s) => s.trim()).filter(Boolean),
        companyCulture: companyCulture || undefined,
        employmentType,
        location: location || undefined,
        remoteStatus,
        requiredExperience: requiredExperience ? Number(requiredExperience) : undefined,
        salaryMin: salaryMin ? Number(salaryMin) : undefined,
        salaryMax: salaryMax ? Number(salaryMax) : undefined,
      });
      onJobCreated();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create job');
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepIndicators = [
    { key: 'input', label: 'Details', num: 1 },
    { key: 'review', label: 'AI Review', num: 2 },
    { key: 'salary', label: 'Salary', num: 3 },
    { key: 'publish', label: 'Publish', num: 4 },
  ];

  const currentStepIndex = step === 'generating' ? 1 : stepIndicators.findIndex((s) => s.key === step);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
      <div className="w-full max-w-2xl rounded-3xl border border-slate-900 bg-[#060813] shadow-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-900/80 px-6 py-5 bg-[#090b14]/40">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-100 tracking-tight">✨ AI Job Creator</h2>
            <p className="text-xs text-slate-500 mt-1">Describe the position and let local AI craft the perfect posting</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 text-lg transition-colors">✕</button>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-900/40 bg-[#090b14]/20">
          {stepIndicators.map((s, i) => (
            <div key={s.key} className="flex items-center gap-2">
              <div className={`flex items-center justify-center h-7 w-7 rounded-full text-xs font-bold transition-all ${
                i <= currentStepIndex
                  ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-slate-100 shadow-[0_0_10px_rgba(139,92,246,0.3)]'
                  : 'bg-slate-900 border border-slate-800 text-slate-500'
              }`}>
                {s.num}
              </div>
              <span className={`text-xs font-bold tracking-tight ${i <= currentStepIndex ? 'text-slate-200' : 'text-slate-600'}`}>
                {s.label}
              </span>
              {i < stepIndicators.length - 1 && (
                <div className={`w-8 h-px md:w-16 ${i < currentStepIndex ? 'bg-violet-500/50' : 'bg-slate-900'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 custom-scrollbar">
          {error && (
            <p className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 p-3.5 rounded-xl">{error}</p>
          )}

          {/* Step 1: Input */}
          {step === 'input' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Job Title *</label>
                <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Senior Full-Stack Engineer"
                  className="w-full rounded-xl border border-slate-800 bg-[#090b14]/50 px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 text-slate-200 transition-all placeholder:text-slate-700" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Key Responsibilities * <span className="text-slate-600 normal-case font-medium">(one per line)</span></label>
                <textarea rows={4} value={responsibilities} onChange={(e) => setResponsibilities(e.target.value)}
                  placeholder="Design and build scalable APIs&#10;Lead code reviews and mentor junior developers&#10;Collaborate with product and design teams"
                  className="w-full rounded-xl border border-slate-800 bg-[#090b14]/50 px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 text-slate-200 transition-all placeholder:text-slate-700" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Required Skills * <span className="text-slate-600 normal-case font-medium">(comma-separated)</span></label>
                <input type="text" value={requiredSkills} onChange={(e) => setRequiredSkills(e.target.value)}
                  placeholder="React, TypeScript, Node.js, PostgreSQL, AWS"
                  className="w-full rounded-xl border border-slate-800 bg-[#090b14]/50 px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 text-slate-200 transition-all placeholder:text-slate-700" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Company Culture <span className="text-slate-600 normal-case font-medium">(optional)</span></label>
                <textarea rows={2} value={companyCulture} onChange={(e) => setCompanyCulture(e.target.value)}
                  placeholder="Fast-paced startup, remote-first, emphasis on innovation and autonomy..."
                  className="w-full rounded-xl border border-slate-800 bg-[#090b14]/50 px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 text-slate-200 transition-all placeholder:text-slate-700" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Location</label>
                  <input type="text" value={location} onChange={(e) => setLocation(e.target.value)}
                    placeholder="San Francisco, CA"
                    className="w-full rounded-xl border border-slate-800 bg-[#090b14]/50 px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 text-slate-200 transition-all placeholder:text-slate-700" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Employment Type</label>
                  <select value={employmentType} onChange={(e) => setEmploymentType(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-[#090b14]/50 px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 text-slate-300 transition-all">
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contract">Contract</option>
                    <option value="Internship">Internship</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Min Salary</label>
                  <input type="number" value={salaryMin} onChange={(e) => setSalaryMin(e.target.value)}
                    placeholder="80000"
                    className="w-full rounded-xl border border-slate-800 bg-[#090b14]/50 px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 text-slate-200 transition-all placeholder:text-slate-700" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Max Salary</label>
                  <input type="number" value={salaryMax} onChange={(e) => setSalaryMax(e.target.value)}
                    placeholder="150000"
                    className="w-full rounded-xl border border-slate-800 bg-[#090b14]/50 px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 text-slate-200 transition-all placeholder:text-slate-700" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Experience (Years)</label>
                  <input type="number" value={requiredExperience} onChange={(e) => setRequiredExperience(e.target.value)}
                    placeholder="3"
                    className="w-full rounded-xl border border-slate-800 bg-[#090b14]/50 px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 text-slate-200 transition-all placeholder:text-slate-700" />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input type="checkbox" id="remoteWizard" checked={remoteStatus} onChange={(e) => setRemoteStatus(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-800 bg-slate-950 accent-violet-600 text-violet-500 focus:ring-violet-500/30" />
                <label htmlFor="remoteWizard" className="text-sm font-semibold text-slate-300 select-none">Remote position</label>
              </div>
            </div>
          )}

          {/* Generating state */}
          {step === 'generating' && (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <div className="h-12 w-12 rounded-full border-2 border-violet-500/30 border-t-violet-500 animate-spin" />
              <p className="text-slate-200 font-bold tracking-tight">Aura is crafting your job description...</p>
              <p className="text-xs text-slate-500 text-center max-w-sm">Analyzing role requirements, generating benefits, and identifying key technical and soft skill metrics</p>
            </div>
          )}

          {/* Step 2: Review AI output */}
          {step === 'review' && generated && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-violet-400 text-sm font-bold">
                  <span className="flex h-2 w-2 rounded-full bg-violet-400 animate-pulse" />
                  AI-Generated Job Description
                </div>
                <div className="flex bg-[#090b14]/80 p-0.5 rounded-lg border border-slate-900">
                  <button
                    type="button"
                    onClick={() => setReviewMode('preview')}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                      reviewMode === 'preview'
                        ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-slate-100 shadow-md'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    👁️ Preview
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewMode('edit')}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                      reviewMode === 'edit'
                        ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-slate-100 shadow-md'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    ✏️ Edit
                  </button>
                </div>
              </div>

              {reviewMode === 'edit' ? (
                <div className="rounded-2xl border border-slate-900 bg-slate-950/60 p-4">
                  <textarea
                    rows={12}
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    className="w-full bg-transparent text-sm text-slate-300 focus:outline-none resize-none custom-scrollbar"
                  />
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-900 bg-slate-950/60 p-5 max-h-[350px] overflow-y-auto custom-scrollbar">
                  {isHTML(editedDescription) ? (
                    <div 
                      className="text-sm text-slate-300 space-y-3 leading-relaxed 
                                 [&_h1]:text-xl [&_h1]:font-extrabold [&_h1]:text-slate-100 [&_h1]:mt-5 [&_h1]:mb-3 [&_h1]:border-b [&_h1]:border-slate-800 [&_h1]:pb-2
                                 [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-slate-200 [&_h2]:mt-4 [&_h2]:mb-2
                                 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-slate-400 [&_h3]:uppercase [&_h3]:tracking-wider [&_h3]:mt-3 [&_h3]:mb-1.5
                                 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-4 [&_ul]:space-y-1.5 
                                 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-4 [&_ol]:space-y-1.5
                                 [&_li]:text-slate-300 [&_p]:mb-3 [&_p]:leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: editedDescription }} 
                    />
                  ) : (
                    renderMarkdown(editedDescription)
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Technical Skills</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {(generated.technicalSkills || []).map((s: any, idx: number) => {
                      const text = normalizeItem(s);
                      return <span key={idx} className="rounded-md bg-violet-500/10 border border-violet-500/20 px-2.5 py-1 text-xs text-violet-400 font-semibold">{text}</span>
                    })}
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Soft Skills</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {(generated.softSkills || []).map((s: any, idx: number) => {
                      const text = normalizeItem(s);
                      return <span key={idx} className="rounded-md bg-pink-500/10 border border-pink-500/20 px-2.5 py-1 text-xs text-pink-400 font-semibold">{text}</span>
                    })}
                  </div>
                </div>
              </div>

              {(generated.benefits || []).length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Benefits & Perks</h4>
                  <ul className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                    {(generated.benefits || []).map((b: any, idx: number) => {
                      const text = normalizeItem(b);
                      return (
                        <li key={idx} className="flex items-start gap-1.5 bg-[#090b14]/20 p-2 rounded-xl border border-slate-900/60">
                          <span className="text-violet-400 font-bold">✓</span> {text}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Salary Analysis */}
          {step === 'salary' && salaryAnalysis && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 text-pink-400 text-sm font-bold">
                <span>📊</span> Market Salary Analysis
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl border border-slate-900 bg-slate-950/40 p-4 text-center">
                  <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Low</p>
                  <p className="text-xl font-bold text-slate-300 mt-1">${(salaryAnalysis.estimatedMin / 1000).toFixed(0)}K</p>
                </div>
                <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4 text-center shadow-[0_0_15px_rgba(139,92,246,0.05)]">
                  <p className="text-xs text-violet-400 uppercase font-bold tracking-wider">Recommended</p>
                  <p className="text-2xl font-extrabold text-violet-400 mt-0.5">${(salaryAnalysis.estimatedMedian / 1000).toFixed(0)}K</p>
                </div>
                <div className="rounded-2xl border border-slate-900 bg-slate-950/40 p-4 text-center">
                  <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">High</p>
                  <p className="text-xl font-bold text-slate-300 mt-1">${(salaryAnalysis.estimatedMax / 1000).toFixed(0)}K</p>
                </div>
              </div>

              <div className={`rounded-xl p-3 text-sm font-semibold border ${
                salaryAnalysis.inputComparison === 'ABOVE_MARKET'
                  ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                  : salaryAnalysis.inputComparison === 'BELOW_MARKET'
                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  : 'bg-slate-900 text-slate-300 border-slate-800'
              }`}>
                {salaryAnalysis.inputComparison === 'ABOVE_MARKET' && '✅ Your salary range is above market — great for attracting top talent!'}
                {salaryAnalysis.inputComparison === 'AT_MARKET' && '📊 Your salary range is competitive with the market.'}
                {salaryAnalysis.inputComparison === 'BELOW_MARKET' && '⚠️ Your salary range is below market. Consider adjusting to attract qualified candidates.'}
              </div>

              <p className="text-sm text-slate-400 leading-relaxed font-light">{salaryAnalysis.summary}</p>

              {(salaryAnalysis.factors || []).length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Key Factors</h4>
                  <ul className="space-y-1.5 text-xs text-slate-400">
                    {salaryAnalysis.factors.map((f: any, i: number) => {
                      const text = typeof f === 'string'
                        ? f
                        : (f && typeof f === 'object'
                          ? (f.skill
                            ? `${f.skill}${f.expectedMinSalary || f.expectedMaxSalary ? ` ($${f.expectedMinSalary?.toLocaleString() ?? '?'}-$${f.expectedMaxSalary?.toLocaleString() ?? '?'})` : ''}`
                            : (Object.values(f).find(v => typeof v === 'string') || JSON.stringify(f))
                          )
                          : String(f)
                        );
                      return (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-pink-400">•</span> {text}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              <div className="flex items-center gap-2 text-xs text-slate-600">
                <span>Confidence: </span>
                <span className={`font-bold ${
                  salaryAnalysis.confidence === 'HIGH' ? 'text-cyan-400' :
                  salaryAnalysis.confidence === 'MEDIUM' ? 'text-amber-400' : 'text-slate-500'
                }`}>{salaryAnalysis.confidence}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer buttons */}
        <div className="flex justify-between items-center gap-3 border-t border-slate-900/80 px-6 py-4 bg-[#090b14]/40">
          <button onClick={onClose} className="btn-premium-outline px-4 py-2 text-xs">
            Cancel
          </button>
          <div className="flex gap-2">
            {step === 'input' && (
              <button
                onClick={handleGenerate}
                disabled={!title || !responsibilities || !requiredSkills}
                className="btn-premium-violet px-5 py-2 text-xs"
              >
                ✨ Generate with AI
              </button>
            )}
            {step === 'review' && (
              <>
                <button onClick={() => setStep('input')} className="btn-premium-outline px-4 py-2 text-xs">
                  ← Back
                </button>
                <button onClick={handleAnalyzeSalary} className="rounded-xl bg-purple-500/10 border border-purple-500/20 px-4 py-2 text-xs font-semibold text-purple-400 hover:bg-purple-500/20 transition-all">
                  📊 Salary Analysis
                </button>
                <button onClick={() => setStep('publish')} className="btn-premium-violet px-5 py-2 text-xs">
                  Review & Publish →
                </button>
              </>
            )}
            {step === 'salary' && (
              <>
                <button onClick={() => setStep('review')} className="btn-premium-outline px-4 py-2 text-xs">
                  ← Back
                </button>
                <button onClick={() => setStep('publish')} className="btn-premium-violet px-5 py-2 text-xs">
                  Review & Publish →
                </button>
              </>
            )}
            {step === 'publish' && (
              <>
                <button onClick={() => setStep('review')} className="btn-premium-outline px-4 py-2 text-xs">
                  ← Back
                </button>
                <button onClick={handlePublish} disabled={isSubmitting}
                  className="btn-premium-violet px-5 py-2 text-xs"
                >
                  {isSubmitting ? 'Publishing...' : '🚀 Publish Job'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function normalizeItem(item: any): string {
  if (!item) return '';
  if (typeof item === 'string') return item;
  if (typeof item === 'object') {
    const val = Object.values(item).find(v => typeof v === 'string');
    if (typeof val === 'string') return val;
    return item.name || item.skill || item.title || item.benefit || item.languageOrFramework || JSON.stringify(item);
  }
  return String(item);
}

function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  let inList = false;
  const elements: React.ReactNode[] = [];
  let listItems: React.ReactNode[] = [];

  const parseInline = (str: string) => {
    const parts = str.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-bold text-slate-100">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    
    if (trimmed.startsWith('# ')) {
      if (inList) {
        elements.push(<ul key={`list-${idx}`} className="list-disc pl-5 mb-4 space-y-1.5 text-slate-300">{listItems}</ul>);
        listItems = [];
        inList = false;
      }
      elements.push(
        <h1 key={idx} className="text-xl font-extrabold text-slate-100 mt-5 mb-3 tracking-tight border-b border-slate-800 pb-2">
          {parseInline(trimmed.slice(2))}
        </h1>
      );
    } else if (trimmed.startsWith('## ')) {
      if (inList) {
        elements.push(<ul key={`list-${idx}`} className="list-disc pl-5 mb-4 space-y-1.5 text-slate-300">{listItems}</ul>);
        listItems = [];
        inList = false;
      }
      elements.push(
        <h2 key={idx} className="text-base font-bold text-slate-200 mt-4 mb-2 tracking-tight">
          {parseInline(trimmed.slice(3))}
        </h2>
      );
    } else if (trimmed.startsWith('### ')) {
      if (inList) {
        elements.push(<ul key={`list-${idx}`} className="list-disc pl-5 mb-4 space-y-1.5 text-slate-300">{listItems}</ul>);
        listItems = [];
        inList = false;
      }
      elements.push(
        <h3 key={idx} className="text-sm font-semibold text-slate-400 uppercase tracking-wider mt-3 mb-1.5">
          {parseInline(trimmed.slice(4))}
        </h3>
      );
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('✓ ')) {
      inList = true;
      const content = trimmed.slice(2);
      const icon = trimmed.startsWith('✓ ') ? '✓ ' : '';
      listItems.push(
        <li key={idx} className="text-sm text-slate-300">
          {icon ? <span className="text-violet-400 mr-1.5">{icon}</span> : null}
          {parseInline(content)}
        </li>
      );
    } else if (trimmed === '') {
      if (inList) {
        elements.push(<ul key={`list-${idx}`} className="list-disc pl-5 mb-4 space-y-1.5 text-slate-300">{listItems}</ul>);
        listItems = [];
        inList = false;
      }
    } else {
      if (inList) {
        elements.push(<ul key={`list-${idx}`} className="list-disc pl-5 mb-4 space-y-1.5 text-slate-300">{listItems}</ul>);
        listItems = [];
        inList = false;
      }
      elements.push(
        <p key={idx} className="text-sm text-slate-300 mb-3 leading-relaxed">
          {parseInline(trimmed)}
        </p>
      );
    }
  });

  if (inList && listItems.length > 0) {
    elements.push(<ul key={`list-end`} className="list-disc pl-5 mb-4 space-y-1.5 text-slate-300">{listItems}</ul>);
  }

  return elements;
}

function isHTML(text: string): boolean {
  return /<[a-z][\s\S]*>/i.test(text);
}
