import { useState } from 'react';
import { jdGenerationApi } from '../../services/api';

interface Props {
  jobId: string;
  jobTitle: string;
}

interface Question {
  id?: string;
  category: string;
  question: string;
  guideline?: string;
}

export default function InterviewQuestions({ jobId, jobTitle }: Props) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('TECHNICAL');
  const [error, setError] = useState('');

  const loadQuestions = async () => {
    try {
      const res = await jdGenerationApi.getInterviewQuestions(jobId);
      setQuestions(res.data.questions || []);
      setIsLoaded(true);
    } catch {
      setQuestions([]);
      setIsLoaded(true);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError('');
    try {
      const res = await jdGenerationApi.generateInterviewQuestions(jobId);
      setQuestions(res.data.questions || []);
      setIsLoaded(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to generate questions');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyQuestion = (q: string) => {
    navigator.clipboard.writeText(q);
  };

  if (!isLoaded) {
    return (
      <button onClick={loadQuestions}
        className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-medium">
        📋 View Interview Questions
      </button>
    );
  }

  const categories = ['TECHNICAL', 'BEHAVIORAL', 'CULTURE_FIT'];
  const filtered = questions.filter((q) => q.category === activeTab);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-200">Interview Questions — {jobTitle}</h4>
        <button onClick={handleGenerate} disabled={isGenerating}
          className="rounded-lg bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 text-xs font-semibold text-indigo-400 hover:bg-indigo-500/20 transition-colors disabled:opacity-50">
          {isGenerating ? '✨ Generating...' : '✨ Regenerate'}
        </button>
      </div>

      {error && <p className="text-xs text-rose-400">{error}</p>}

      {questions.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-sm text-slate-500 mb-3">No interview questions yet.</p>
          <button onClick={handleGenerate} disabled={isGenerating}
            className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-400 transition-colors disabled:opacity-50">
            {isGenerating ? 'Generating...' : '✨ Generate Questions with AI'}
          </button>
        </div>
      ) : (
        <>
          <div className="flex gap-1">
            {categories.map((cat) => (
              <button key={cat} onClick={() => setActiveTab(cat)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  activeTab === cat
                    ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                    : 'text-slate-500 hover:text-slate-300'
                }`}>
                {cat.replace('_', ' ')}
                <span className="ml-1 text-slate-600">({questions.filter((q) => q.category === cat).length})</span>
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {filtered.map((q, i) => (
              <div key={i} className="rounded-lg border border-slate-800 bg-slate-950/50 p-3 space-y-1.5 group">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm text-slate-200">{q.question}</p>
                  <button onClick={() => copyQuestion(q.question)}
                    className="shrink-0 opacity-0 group-hover:opacity-100 text-xs text-slate-500 hover:text-slate-300 transition-all">
                    Copy
                  </button>
                </div>
                {q.guideline && (
                  <p className="text-xs text-slate-500 italic">💡 {q.guideline}</p>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
