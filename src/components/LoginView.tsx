import React, { useState } from 'react';
import { ApiClient } from '../utils/api';
import { Shield, Loader2 } from 'lucide-react';

export const LoginView: React.FC<{ onLogin: () => void }> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please enter nickname and password');
      return;
    }
    try {
      setLoading(true);
      setError('');
      await ApiClient.login(username, password);
      onLogin();
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-[#1E293B] rounded-2xl border border-[#334155] p-6 shadow-2xl">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 bg-sky-500/20 rounded-full flex items-center justify-center mb-3">
            <Shield className="w-6 h-6 text-sky-400" />
          </div>
          <h1 className="text-xl font-bold text-slate-100">Dictionary Login</h1>
          <p className="text-xs text-slate-400 mt-1 text-center">
            Sign in to access the collaborative word graph.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Nickname</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full bg-[#0F172A] border border-[#334155] focus:border-sky-500 rounded-lg p-2.5 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500"
              placeholder="Enter your nickname"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-[#0F172A] border border-[#334155] focus:border-sky-500 rounded-lg p-2.5 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500"
              placeholder="Enter your password"
            />
          </div>

          {error && <p className="text-xs text-rose-400 text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};
