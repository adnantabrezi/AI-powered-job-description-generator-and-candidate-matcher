import { Routes, Route, Link, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import CandidateDashboard from './pages/candidate/CandidateDashboard';
import EmployerDashboard from './pages/employer/EmployerDashboard';
import JobSearchPage from './pages/candidate/JobSearchPage';

function App() {
  const token = localStorage.getItem('accessToken');
  const userRole = localStorage.getItem('userRole');
  const dashPath = userRole === 'EMPLOYER' ? '/dashboard/employer' : '/dashboard/candidate';

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userRole');
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen flex flex-col pb-10">
      <nav className="sticky top-0 z-50 border-b border-slate-900/60 bg-slate-950/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2 text-xl font-bold tracking-tight text-emerald-400 hover:text-emerald-300 transition-colors">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-sm">⚡</span>
            <span>AI Job Board</span>
          </Link>
          <div className="flex gap-6 items-center text-sm font-semibold">
            <Link to="/jobs" className="text-slate-300 hover:text-emerald-400 transition-colors">Find Jobs</Link>
            {token ? (
              <>
                {userRole === 'CANDIDATE' && (
                  <Link to="/dashboard/candidate" className="text-slate-300 hover:text-emerald-400 transition-colors">Dashboard</Link>
                )}
                {userRole === 'EMPLOYER' && (
                  <Link to="/dashboard/employer" className="text-slate-300 hover:text-emerald-400 transition-colors">Dashboard</Link>
                )}
                <button
                  onClick={handleLogout}
                  className="rounded-xl bg-rose-500/10 border border-rose-500/20 px-3.5 py-1.5 text-xs font-bold text-rose-400 hover:bg-rose-500/20 transition-all"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-slate-300 hover:text-emerald-400 transition-colors">Login</Link>
                <Link to="/register" className="premium-glow rounded-xl bg-emerald-500 px-4 py-2 font-bold text-slate-950 hover:bg-emerald-400 transition-all text-xs">
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={token ? <Navigate to={dashPath} /> : <LoginPage />} />
          <Route path="/register" element={token ? <Navigate to={dashPath} /> : <RegisterPage />} />
          <Route path="/jobs" element={<JobSearchPage />} />
          <Route
            path="/dashboard/candidate"
            element={token && userRole === 'CANDIDATE' ? <CandidateDashboard /> : <Navigate to="/login" />}
          />
          <Route
            path="/dashboard/employer"
            element={token && userRole === 'EMPLOYER' ? <EmployerDashboard /> : <Navigate to="/login" />}
          />
        </Routes>
      </main>
    </div>
  );
}

export default App;
