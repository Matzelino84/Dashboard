import React, { useState } from 'react';
import { supabase } from './supabaseClient';
import { Lock, Mail, Loader2 } from 'lucide-react';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError("Login fehlgeschlagen: " + error.message);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#121212] flex items-center justify-center p-4">
      <div className="bg-[#1e1e1e] p-8 rounded-3xl border border-[#333] shadow-2xl w-full max-w-md">
        <div className="flex justify-center mb-6">
          <div className="bg-green-500/20 p-4 rounded-full">
            <Lock className="text-green-500" size={32} />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-white text-center mb-8">Projekt-Login</h1>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">E-Mail</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-gray-500" size={18} />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-[#121212] border border-[#333] rounded-xl p-3 pl-10 text-white outline-none focus:border-green-500 transition-colors" placeholder="name@beispiel.de" required />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Passwort</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-gray-500" size={18} />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-[#121212] border border-[#333] rounded-xl p-3 pl-10 text-white outline-none focus:border-green-500 transition-colors" placeholder="••••••••" required />
            </div>
          </div>
          
          {error && <p className="text-red-500 text-sm font-bold bg-red-500/10 p-2 rounded-lg text-center">{error}</p>}
          
          <button type="submit" disabled={loading} className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2">
            {loading ? <Loader2 className="animate-spin" /> : "Anmelden"}
          </button>
        </form>
      </div>
    </div>
  );
}