import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../services/api';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const { data } = await authApi.login(email, password);
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('userRole', data.role);
      // Use location.href to navigate + force full re-render for navbar state
      window.location.href = data.role === 'EMPLOYER'
        ? '/dashboard/employer'
        : '/dashboard/candidate';
    } catch {
      setError('Invalid credentials');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-md space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-8">
      <h2 className="text-2xl font-semibold">Login</h2>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2"
        required
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2"
        required
      />
      <button type="submit" className="w-full rounded-lg bg-emerald-500 py-2 font-medium text-slate-950">
        Sign In
      </button>
    </form>
  );
}
