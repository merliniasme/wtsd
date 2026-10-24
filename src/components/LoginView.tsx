import React, { useState } from 'react';
import { ApiClient } from '../utils/api';
import { Loader2 } from 'lucide-react';

export const LoginView: React.FC<{ onLogin: () => void }> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please enter username and password');
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
    <div className="min-h-screen bg-[#0A192F] flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-[#112240] rounded-xl border border-[#233554] p-6 shadow-sm">
        <div className="flex flex-col items-center mb-6">
          <img 
            src="/app-icon.jpg" 
            alt="Spydex Logo" 
            className="w-16 h-16 rounded-xl border border-[#233554] mb-3 object-cover bg-[#0A192F]"
          />
          <h1 className="text-2xl font-bold text-[#F8FAFC] tracking-tight text-center">Spydex</h1>
          <p className="text-xs font-semibold text-[#00D2FF] mt-1 text-center tracking-wide">
            The Ultimate Spy Toolkit
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full bg-[#080F1E] border border-[#233554] text-[#F8FAFC] placeholder-[#64748B] rounded-lg px-3.5 py-2.5 focus:outline-none focus:border-[#00D2FF] focus:ring-1 focus:ring-[#00D2FF] text-sm transition-all"
              placeholder="Enter your username"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-[#080F1E] border border-[#233554] text-[#F8FAFC] placeholder-[#64748B] rounded-lg px-3.5 py-2.5 focus:outline-none focus:border-[#00D2FF] focus:ring-1 focus:ring-[#00D2FF] text-sm transition-all"
              placeholder="Enter your password"
            />
          </div>

          {error && (
            <div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg p-2.5 text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#00D2FF] hover:bg-[#38BDF8] disabled:opacity-50 text-[#0A192F] font-semibold rounded-lg transition-all duration-200 active:scale-[0.98] cursor-pointer"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};
