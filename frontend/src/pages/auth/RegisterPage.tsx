import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../services/api';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState<'candidate' | 'employer'>('candidate');
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (role === 'candidate') {
        await authApi.registerCandidate(name, email, password);
      } else {
        await authApi.registerEmployer(companyName, email, password);
      }
      navigate('/login');
    } catch {
      setError('Registration failed. Check your details.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-md space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-8">
      <h2 className="text-2xl font-semibold">Create Account</h2>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setRole('candidate')}
          className={`flex-1 rounded-lg py-2 ${role === 'candidate' ? 'bg-emerald-500 text-slate-950' : 'border border-slate-700'}`}
        >
          Candidate
        </button>
        <button
          type="button"
          onClick={() => setRole('employer')}
          className={`flex-1 rounded-lg py-2 ${role === 'employer' ? 'bg-emerald-500 text-slate-950' : 'border border-slate-700'}`}
        >
          Employer
        </button>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {role === 'candidate' ? (
        <input
          placeholder="Full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2"
          required
        />
      ) : (
        <input
          placeholder="Company name"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2"
          required
        />
      )}
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
        placeholder="Password (min 8, upper, lower, number, special)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2"
        required
      />
      <button type="submit" className="w-full rounded-lg bg-emerald-500 py-2 font-medium text-slate-950">
        Register
      </button>
    </form>
  );
}
