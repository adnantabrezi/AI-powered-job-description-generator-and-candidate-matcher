import { Link } from 'react-router-dom';

export default function HomePage() {
  const token = localStorage.getItem('accessToken');
  const userRole = localStorage.getItem('userRole');
  const dashPath = userRole === 'EMPLOYER' ? '/dashboard/employer' : '/dashboard/candidate';

  return (
    <div className="space-y-20 py-12">
      {/* Hero Section */}
      <section className="space-y-6 text-center max-w-4xl mx-auto py-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1 text-sm font-semibold text-violet-400">
          <span className="flex h-2 w-2 rounded-full bg-violet-400 animate-pulse"></span>
          Now powered by Gemma 3-1B Local LLM
        </div>
        <h1 className="text-6xl font-extrabold tracking-tight text-slate-100 sm:text-7xl">
          Meet <span className="text-gradient-violet">Aura</span>.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-400 leading-relaxed font-light">
          The smart job board that automatically matches resumes with job requirements using local LLM semantic embeddings. Search less, match more.
        </p>
        <div className="flex justify-center gap-4 pt-4">
          <Link
            to="/jobs"
            className="btn-premium-violet px-7 py-3.5 text-sm"
          >
            Browse Jobs
          </Link>
          <Link
            to={token ? dashPath : "/register"}
            className="btn-premium-outline px-7 py-3.5 text-sm"
          >
            {token ? 'Go to Dashboard' : 'Get Started'}
          </Link>
        </div>
      </section>

      {/* Feature Cards Grid */}
      <section className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        <div className="premium-card rounded-2xl p-6 space-y-4">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/25 text-lg">
            ✨
          </div>
          <h3 className="text-xl font-bold text-slate-100">AI Compatibility Scoring</h3>
          <p className="text-sm text-slate-400 leading-relaxed font-light">
            Resumes are instantly parsed and checked against jobs using vector math and LLM evaluations. Matches are scored out of 100%.
          </p>
        </div>

        <div className="premium-card rounded-2xl p-6 space-y-4">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-pink-500/10 text-pink-400 border border-pink-500/25 text-lg">
            🔍
          </div>
          <h3 className="text-xl font-bold text-slate-100">Semantic Vector Search</h3>
          <p className="text-sm text-slate-400 leading-relaxed font-light">
            Search jobs conceptually. Type "React remote" or "internship with python" and find contextually matching postings instantly.
          </p>
        </div>

        <div className="premium-card rounded-2xl p-6 space-y-4">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 text-lg">
            ✉️
          </div>
          <h3 className="text-xl font-bold text-slate-100">SendGrid Notifications</h3>
          <p className="text-sm text-slate-400 leading-relaxed font-light">
            Stay updated in real-time. Candidate match recommendations and employer status updates are instantly dispatched via SendGrid.
          </p>
        </div>
      </section>

      {/* Stats Section */}
      <section className="max-w-5xl mx-auto rounded-3xl border border-slate-800 bg-[#090b14]/30 p-8 backdrop-blur text-center grid grid-cols-3 gap-4">
        <div>
          <p className="text-3xl font-extrabold text-violet-400">100%</p>
          <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mt-1">Local AI Processing</p>
        </div>
        <div className="border-x border-slate-800">
          <p className="text-3xl font-extrabold text-pink-400">&lt; 3s</p>
          <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mt-1">Search Latency</p>
        </div>
        <div>
          <p className="text-3xl font-extrabold text-cyan-400">Real-Time</p>
          <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mt-1">Match Calculations</p>
        </div>
      </section>
    </div>
  );
}
