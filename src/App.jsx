import React, { useState, useRef, useEffect } from 'react';
import { CheckCircle2, Circle, Calendar as CalendarIcon, UploadCloud, Plus, Trash2, Menu, X, Briefcase, RefreshCw, LogOut, Building, FileText, Receipt, Paperclip, Eye, Sun, Moon } from 'lucide-react';
import { supabase } from './supabaseClient';
import Login from './Login';

export default function App() {
  const [session, setSession] = useState(null);
  const [isDark, setIsDark] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState(null);
  const [projectsList, setProjectsList] = useState([]);
  const [syncStatus, setSyncStatus] = useState('saved');

  // --- FORM STATES ---
  const [companyName, setCompanyName] = useState('Neues Projekt');
  const [customerData, setCustomerData] = useState({ street: '', city: '' });
  const [contacts, setContacts] = useState([{ id: 1, name: '', position: '' }]);
  const [tasks, setTasks] = useState({ datensatz: false, ankuendigung: false });
  const [notes, setNotes] = useState('');

  // --- AUTH LOGIK ---
  useEffect(() => {
    // Session beim Start prüfen
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Auf Auth-Änderungen hören (z.B. Magic Link Klick)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProjects();
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  // --- DATEN-LOGIK ---
  const fetchProjects = async () => {
    const { data, error } = await supabase.from('projects').select('*').order('updated_at', { ascending: false });
    if (!error && data) setProjectsList(data);
  };

  useEffect(() => {
    if (session) fetchProjects();
  }, [session]);

  // Automatisches Speichern (Auto-Sync)
  useEffect(() => {
    if (!session || companyName === 'Neues Projekt') return;

    const timer = setTimeout(async () => {
      setSyncStatus('saving');
      const payload = {
        company_name: companyName,
        customer_data: customerData,
        contacts: contacts,
        tasks: tasks,
        notes: notes,
        user_id: session.user.id,
        updated_at: new Date()
      };

      const { data, error } = await supabase.from('projects').upsert(currentProjectId ? { id: currentProjectId, ...payload } : payload).select();
      
      if (!error && data[0]) {
        setCurrentProjectId(data[0].id);
        setSyncStatus('saved');
        fetchProjects();
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [companyName, customerData, contacts, tasks, notes, session]);

  if (!session) return <Login />;

  const theme = {
    bg: isDark ? 'bg-[#121212]' : 'bg-[#f0f2f5]',
    card: isDark ? 'bg-[#1e1e1e] border-[#333]' : 'bg-white border-gray-200 shadow-sm',
    text: isDark ? 'text-white' : 'text-gray-900',
    input: isDark ? 'bg-[#121212] border-[#333] text-white' : 'bg-gray-50 border-gray-300 text-gray-900'
  };

  return (
    <div className={`min-h-screen ${theme.bg} ${theme.text} transition-colors duration-300`}>
      {/* HEADER */}
      <header className={`p-4 border-b ${isDark ? 'border-[#333]' : 'border-gray-200'} flex justify-between items-center`}>
        <div className="flex items-center gap-4">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 hover:bg-gray-500/10 rounded-lg"><Menu /></button>
          <input 
            className="text-2xl font-bold bg-transparent border-none outline-none"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-4">
          <div className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
            {syncStatus === 'saving' ? <RefreshCw size={14} className="animate-spin text-blue-500"/> : <CheckCircle2 size={14} className="text-green-500"/>}
            {syncStatus}
          </div>
          <button onClick={() => setIsDark(!isDark)} className="p-2 rounded-full hover:bg-gray-500/10">
            {isDark ? <Sun size={20} className="text-yellow-400"/> : <Moon size={20}/>}
          </button>
          <button onClick={handleLogout} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg"><LogOut size={20}/></button>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="p-6 max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Kunden-Sektion */}
        <section className={`p-6 rounded-2xl border ${theme.card}`}>
          <h2 className="flex items-center gap-2 font-bold mb-4"><Building size={18} className="text-blue-500"/> Stammdaten</h2>
          <div className="space-y-4">
            <input 
              placeholder="Straße & Hausnummer" 
              className={`w-full p-3 rounded-xl outline-none border ${theme.input}`}
              value={customerData.street}
              onChange={(e) => setCustomerData({...customerData, street: e.target.value})}
            />
            <input 
              placeholder="PLZ & Ort" 
              className={`w-full p-3 rounded-xl outline-none border ${theme.input}`}
              value={customerData.city}
              onChange={(e) => setCustomerData({...customerData, city: e.target.value})}
            />
          </div>
        </section>

        {/* Notizen-Sektion */}
        <section className={`p-6 rounded-2xl border ${theme.card}`}>
          <h2 className="flex items-center gap-2 font-bold mb-4"><FileText size={18} className="text-green-500"/> Projektnotizen</h2>
          <textarea 
            className={`w-full h-32 p-4 rounded-xl outline-none border resize-none ${theme.input}`}
            placeholder="Wichtige Infos..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </section>
      </main>

      {/* SIDEBAR */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setIsSidebarOpen(false)}></div>
          <div className={`relative w-80 h-full p-6 shadow-xl ${isDark ? 'bg-[#1e1e1e]' : 'bg-white'}`}>
            <div className="flex justify-between items-center mb-8">
              <h2 className="font-bold flex items-center gap-2"><Briefcase size={20} className="text-blue-500"/> Projekte</h2>
              <button onClick={() => setIsSidebarOpen(false)}><X /></button>
            </div>
            <button 
              onClick={() => { setCurrentProjectId(null); setCompanyName('Neues Projekt'); setIsSidebarOpen(false); }}
              className="w-full py-3 mb-4 border-2 border-dashed border-gray-500/30 rounded-xl font-bold flex items-center justify-center gap-2 hover:border-blue-500 transition-all"
            >
              <Plus size={18}/> Neues Projekt
            </button>
            <div className="space-y-2">
              {projectsList.map(p => (
                <div 
                  key={p.id} 
                  onClick={() => { setCurrentProjectId(p.id); setCompanyName(p.company_name); setIsSidebarOpen(false); }}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${currentProjectId === p.id ? 'border-blue-500 bg-blue-500/5' : 'border-transparent hover:bg-gray-500/5'}`}
                >
                  <div className="font-bold truncate">{p.company_name}</div>
                  <div className="text-[10px] opacity-50 uppercase mt-1">Stand: {new Date(p.updated_at).toLocaleDateString()}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}