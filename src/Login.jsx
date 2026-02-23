import React, { useState } from 'react';
import { supabase } from './supabaseClient';
import { Mail, Loader2, Send } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const handleMagicLink = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const { error } = await supabase.auth.signInWithOtp({
      email: email,
      options: {
        // Leitet den User nach dem Klick auf den E-Mail-Link zurück zur App
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      setError("Fehler: " + error.message);
    } else {
      setMessage("Check dein Postfach! Wir haben dir einen sicheren Login-Link geschickt.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#121212] flex items-center justify-center p-4">
      <div className="bg-[#1e1e1e] p-8 rounded-3xl border border-[#333] shadow-2xl w-full max-w-md">
        <div className="flex justify-center mb-6">
          <div className="bg-blue-500/20 p-4 rounded-full">
            <Send className="text-blue-400" size={32} />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-white text-center mb-2">Projekt-Login</h1>
        <p className="text-gray-400 text-center text-sm mb-8">
          Gib deine E-Mail ein und erhalte einen Login-Link direkt in dein Postfach.
        </p>
        
        <form onSubmit={handleMagicLink} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">E-Mail Adresse</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-gray-500" size={18} />
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                className="w-full bg-[#121212] border border-[#333] rounded-xl p-3 pl-10 text-white outline-none focus:border-blue-500 transition-colors" 
                placeholder="name@beispiel.de" 
                required 
              />
            </div>
          </div>
          
          {error && <p className="text-red-500 text-sm font-bold bg-red-500/10 p-2 rounded-lg text-center">{error}</p>}
          {message && <p className="text-green-500 text-sm font-bold bg-green-500/10 p-2 rounded-lg text-center">{message}</p>}
          
          <button 
            type="submit" 
            disabled={loading} 
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" /> : "Link senden"}
          </button>
        </form>

        <p className="mt-8 text-[10px] text-gray-500 text-center uppercase tracking-widest">
          Sicherer Zugang ohne Passwort
        </p>
      </div>
    </div>
  );
}