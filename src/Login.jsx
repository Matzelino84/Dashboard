import React, { useState } from 'react';
import { supabase } from './supabaseClient';
import { Lock, Mail, Loader2, UserPlus, HelpCircle } from 'lucide-react';

export default function Login() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  // --- LOGIN LOGIK ---
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError("Login fehlgeschlagen: " + error.message);
    setLoading(false);
  };

  // --- REGISTRIERUNGS LOGIK ---
  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setError("Registrierung fehlgeschlagen: " + error.message);
    } else {
      setMessage("Account erstellt! Falls 'Email-Bestätigung' in Supabase aktiv ist, prüfe dein Postfach.");
      setIsRegistering(false);
    }
    setLoading(false);
  };

  // --- PASSWORT VERGESSEN ---
  const handleForgotPassword = async () => {
    if (!email) {
      setError("Bitte gib zuerst deine E-Mail Adresse ein.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    if (error) setError(error.message);
    else setMessage("Link zum Zurücksetzen wurde gesendet (falls Account existiert).");
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#121212] flex items-center justify-center p-4">
      <div className="bg-[#1e1e1e] p-8 rounded-3xl border border-[#333] shadow-2xl w-full max-w-md">
        <div className="flex justify-center mb-6">
          <div className="bg-green-500/20 p-4 rounded-full">
            {isRegistering ? <UserPlus className="text-green-500" size={32} /> : <Lock className="text-green-500" size={32} />}
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-white text-center mb-8">
          {isRegistering ? "Neuen Account erstellen" : "Projekt-Login"}
        </h1>
        
        <form onSubmit={isRegistering ? handleRegister : handleLogin} className="space-y-4">
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
          {message && <p className="text-blue-500 text-sm font-bold bg-blue-500/10 p-2 rounded-lg text-center">{message}</p>}
          
          <button type="submit" disabled={loading} className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2">
            {loading ? <Loader2 className="animate-spin" /> : (isRegistering ? "Registrieren" : "Anmelden")}
          </button>
        </form>

        <div className="mt-6 flex flex-col gap-3 text-center">
          <button 
            onClick={() => setIsRegistering(!isRegistering)} 
            className="text-gray-400 hover:text-white text-sm transition-colors"
          >
            {isRegistering ? "Bereits einen Account? Hier anmelden" : "Noch kein Konto? Registrieren"}
          </button>
          
          {!isRegistering && (
            <button 
              onClick={handleForgotPassword} 
              className="text-gray-500 hover:text-gray-300 text-xs flex items-center justify-center gap-1 transition-colors"
            >
              <HelpCircle size={14} /> Passwort vergessen?
            </button>
          )}
        </div>
      </div>
    </div>
  );
}