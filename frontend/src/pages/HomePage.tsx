import { Link } from 'react-router-dom';

export default function HomePage() {
  const token = localStorage.getItem('accessToken');
  const userRole = localStorage.getItem('userRole');
  const dashPath = userRole === 'EMPLOYER' ? '/dashboard/employer' : '/dashboard/candidate';

  return (
    <div className="space-y-20 py-12">
      {/* Hero Section */}
      <section className="space-y-6 text-center max-w-4xl mx-auto py-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1 text-sm font-semibold text-emerald-400">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
          Now powered by Gemma 3-1B Local LLM
        </div>
        <h1 className="text-6xl font-extrabold tracking-tight leading-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-100 via-emerald-400 to-indigo-400">
          Find your next role with <br />
          <span className="text-emerald-400 relative">
            AI-driven compatibility
            <span className="absolute bottom-0 left-0 w-full h-[3px] bg-emerald-400/40 rounded"></span>
          </span>
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-slate-400 font-light leading-relaxed">
          The smart job board that automatically matches resumes with job requirements using local LLM semantic embeddings. Search less, match more.
        </p>
        <div className="flex justify-center gap-4 pt-4">
          <Link
            to="/jobs"
            className="premium-glow rounded-xl bg-emerald-500 px-7 py-3.5 font-semibold text-slate-950 hover:bg-emerald-400 transition-all shadow-lg"
          >
            Browse Jobs
          </Link>
          <Link
            to={token ? dashPath : "/register"}
            className="rounded-xl border border-slate-800 bg-slate-900/60 px-7 py-3.5 font-semibold hover:border-slate-700 hover:text-emerald-400 transition-all backdrop-blur"
          >
            {token ? 'Go to Dashboard' : 'Get Started'}
          </Link>
        </div>
      </section>

      {/* Feature Cards Grid */}
      <section className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        <div className="premium-card rounded-2xl p-6 space-y-3">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
            ✨
          </div>
          <h3 className="text-xl font-bold text-slate-100">AI Compatibility Scoring</h3>
          <p className="text-sm text-slate-400 leading-relaxed font-light">
            Resumes are instantly parsed and checked against jobs using vector math and LLM evaluations. Matches are scored out of 100%.
          </p>
        </div>

        <div className="premium-card rounded-2xl p-6 space-y-3">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/25">
            🔍
          </div>
          <h3 className="text-xl font-bold text-slate-100">Semantic Vector Search</h3>
          <p className="text-sm text-slate-400 leading-relaxed font-light">
            Search jobs conceptually. Type "React remote" or "internship with python" and find contextually matching postings instantly.
          </p>
        </div>

        <div className="premium-card rounded-2xl p-6 space-y-3">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/25">
            ✉️
          </div>
          <h3 className="text-xl font-bold text-slate-100">SendGrid Notifications</h3>
          <p className="text-sm text-slate-400 leading-relaxed font-light">
            Stay updated in real-time. Candidate match recommendations and employer status updates are instantly dispatched via SendGrid.
          </p>
        </div>
      </section>

      {/* Stats Section */}
      <section className="max-w-5xl mx-auto rounded-3xl border border-slate-800 bg-slate-900/40 p-8 backdrop-blur text-center grid grid-cols-3 gap-4">
        <div>
          <p className="text-3xl font-extrabold text-emerald-400">100%</p>
          <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mt-1">Local AI Processing</p>
        </div>
        <div className="border-x border-slate-800">
          <p className="text-3xl font-extrabold text-indigo-400">&lt; 3s</p>
          <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mt-1">Search Latency</p>
        </div>
        <div>
          <p className="text-3xl font-extrabold text-emerald-400">Real-Time</p>
          <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mt-1">Match Calculations</p>
        </div>
      </section>
    </div>
  );
}
