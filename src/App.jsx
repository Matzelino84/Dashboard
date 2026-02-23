import React, { useState, useRef, useEffect } from 'react';
import { CheckCircle2, Circle, Calendar as CalendarIcon, UploadCloud, Plus, Trash2, ChevronDown, ChevronUp, Users, Building, FileText, Wrench, AlertCircle, ShieldCheck, Sun, Moon, Menu, X, Briefcase, Download, Eye, Receipt, MessageSquare, Paperclip, RefreshCw, LogOut } from 'lucide-react';
import { supabase } from './supabaseClient';
import Login from './Login'; // WICHTIG: Die Login-Komponente importieren

export default function App() {
  // --- AUTH STATE ---
  const [session, setSession] = useState(null);

  // --- UI & THEME STATES ---
  const [isDark, setIsDark] = useState(true); 
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState(null); 
  
  // --- DATA STATES ---
  const [currentProjectId, setCurrentProjectId] = useState(null);
  const [syncStatus, setSyncStatus] = useState('saved'); 
  const [projectsList, setProjectsList] = useState([]); 
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // --- FORMULAR STATES ---
  const [companyName, setCompanyName] = useState('Neues Projekt');
  const [customerData, setCustomerData] = useState({ street: '', city: '', phone: '', email: '' });
  const [contacts, setContacts] = useState([{ id: 1, name: '', position: '', phone: '', email: '' }]);
  const [orderDetails, setOrderDetails] = useState({ quantity: '', conditions: '', eichaustausch: false, funkumruestung: false, other: false });
  const [software, setSoftware] = useState(null);
  const [repairsApproved, setRepairsApproved] = useState(null);
  const [meterInfo, setMeterInfo] = useState({ newManufacturer: '', newType: '', currentInstalled: '' });
  const [vehicles, setVehicles] = useState([]);
  const [newVehicle, setNewVehicle] = useState('');
  const [employees, setEmployees] = useState([]);
  const [newEmployee, setNewEmployee] = useState('');
  const [tasks, setTasks] = useState({ parkausweise: false, mitarbeiter: false, datensatz: false, ankuendigung: false, datenimport: false });
  const [files, setFiles] = useState({ datensatz: null, ankuendigung: null, auftragsdokument: null });
  const [lvItems, setLvItems] = useState([{ id: Date.now(), pos: '1.01', desc: 'Zählertausch Standard', price: '' }]);
  const [notes, setNotes] = useState('');
  const [extraFiles, setExtraFiles] = useState([]);
  const [kickoffDate, setKickoffDate] = useState('');
  const [expandedCard, setExpandedCard] = useState(null);
  
  const dateInputRef = useRef(null);

  // --- AUTH LOGIK ---
  useEffect(() => {
    // Aktuelle Session beim Laden prüfen
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Auf Login/Logout Events reagieren
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // --- PFLICHTFELDER PRÜFUNG ---
  const hasValidContact = contacts.some(c => c.name.trim() !== '');
  const isReadyToStart = kickoffDate !== '' && hasValidContact && files.ankuendigung !== null && files.datensatz !== null && tasks.datenimport === true;
  const progressSteps = [hasValidContact, kickoffDate !== '', tasks.parkausweise, tasks.mitarbeiter, files.datensatz !== null, files.ankuendigung !== null, tasks.datenimport];
  const completedSteps = progressSteps.filter(Boolean).length;
  const progressPercentage = Math.round((completedSteps / 7) * 100) || 0;

  // --- AUTO-SYNC MIT DATENBANK ---
  useEffect(() => {
    if (!session) return; // Nur speichern wenn eingeloggt
    if (isInitialLoad) { setIsInitialLoad(false); return; }
    if (!companyName || companyName === 'Neues Projekt') return;

    setSyncStatus('saving');
    const timer = setTimeout(async () => {
      try {
        const payload = {
          company_name: companyName, 
          customer_data: customerData, 
          contacts: contacts, 
          order_details: orderDetails, 
          software: software, 
          repairs_approved: repairsApproved, 
          meter_info: meterInfo, 
          vehicles: vehicles, 
          employees: employees, 
          tasks: tasks, 
          lv_items: lvItems, 
          notes: notes, 
          kickoff_date: kickoffDate, 
          progress_percentage: progressPercentage, 
          is_ready_to_start: isReadyToStart,
          files: files,
          extra_files: extraFiles,
          user_id: session.user.id, // Verknüpfung zum User
          updated_at: new Date()
        };
        if (currentProjectId) payload.id = currentProjectId;

        const { data, error } = await supabase.from('projects').upsert(payload).select();
        if (error) throw error;
        
        if (data && data[0] && !currentProjectId) setCurrentProjectId(data[0].id);
        
        setSyncStatus('saved');
        fetchProjectsFromSupabase();
      } catch (error) {
        console.error("Speicherfehler:", error);
        setSyncStatus('error');
      }
    }, 1500); 
    return () => clearTimeout(timer);
  }, [companyName, customerData, contacts, orderDetails, software, repairsApproved, meterInfo, vehicles, employees, tasks, lvItems, notes, kickoffDate, progressPercentage, isReadyToStart, files, extraFiles, session]);

  const fetchProjectsFromSupabase = async () => {
    if (!session) return;
    const { data } = await supabase.from('projects').select('id, company_name, progress_percentage, is_ready_to_start').order('updated_at', { ascending: false });
    if (data) setProjectsList(data);
  };

  useEffect(() => { if (session) fetchProjectsFromSupabase(); }, [session]);

  const loadProject = async (id) => {
    setIsSidebarOpen(false);
    const { data } = await supabase.from('projects').select('*').eq('id', id).single();
    if (data) {
      setCurrentProjectId(data.id);
      setCompanyName(data.company_name || 'Unbekannt'); 
      setCustomerData(data.customer_data || { street: '', city: '', phone: '', email: '' }); 
      setContacts(data.contacts || [{ id: 1, name: '', position: '', phone: '', email: '' }]); 
      setOrderDetails(data.order_details || { quantity: '', conditions: '', eichaustausch: false, funkumruestung: false, other: false }); 
      setSoftware(data.software || null); 
      setRepairsApproved(data.repairs_approved ?? null); 
      setMeterInfo(data.meter_info || { newManufacturer: '', newType: '', currentInstalled: '' }); 
      setVehicles(data.vehicles || []); 
      setEmployees(data.employees || []); 
      setTasks(data.tasks || { parkausweise: false, mitarbeiter: false, datensatz: false, ankuendigung: false, datenimport: false }); 
      setLvItems(data.lv_items || [{ id: Date.now(), pos: '1.01', desc: 'Zählertausch Standard', price: '' }]); 
      setNotes(data.notes || ''); 
      setKickoffDate(data.kickoff_date || '');
      setFiles(data.files || { datensatz: null, ankuendigung: null, auftragsdokument: null });
      setExtraFiles(data.extra_files || []);
    }
  };

  const resetToNewProject = () => {
    setCurrentProjectId(null); setCompanyName('Neues Projekt'); setCustomerData({ street: '', city: '', phone: '', email: '' }); setContacts([{ id: 1, name: '', position: '', phone: '', email: '' }]); setOrderDetails({ quantity: '', conditions: '', eichaustausch: false, funkumruestung: false, other: false }); setSoftware(null); setRepairsApproved(null); setMeterInfo({ newManufacturer: '', newType: '', currentInstalled: '' }); setVehicles([]); setEmployees([]); setTasks({ parkausweise: false, mitarbeiter: false, datensatz: false, ankuendigung: false, datenimport: false }); setLvItems([{ id: Date.now(), pos: '1.01', desc: 'Zählertausch Standard', price: '' }]); setNotes(''); setKickoffDate(''); setFiles({ datensatz: null, ankuendigung: null, auftragsdokument: null }); setExtraFiles([]); setIsSidebarOpen(false);
  };

  const deleteProject = async (e, id) => {
    e.stopPropagation(); 
    if(window.confirm("Projekt wirklich löschen? Alle verknüpften Dateien werden ebenfalls gelöscht!")) {
      const { data: project } = await supabase.from('projects').select('files, extra_files').eq('id', id).single();
      let pathsToDelete = [];
      if (project?.files) {
        if (project.files.datensatz?.path) pathsToDelete.push(project.files.datensatz.path);
        if (project.files.ankuendigung?.path) pathsToDelete.push(project.files.ankuendigung.path);
        if (project.files.auftragsdokument?.path) pathsToDelete.push(project.files.auftragsdokument.path);
      }
      if (project?.extra_files) {
        project.extra_files.forEach(file => { if (file.path) pathsToDelete.push(file.path); });
      }
      if (pathsToDelete.length > 0) await supabase.storage.from('project-files').remove(pathsToDelete);
      await supabase.from('projects').delete().eq('id', id);
      if(currentProjectId === id) resetToNewProject();
      fetchProjectsFromSupabase();
    }
  };

  // --- DATEI HANDLER ---
  const handleFileUpload = async (taskKey, e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSyncStatus('saving');
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${currentProjectId || 'temp'}/${taskKey}/${Date.now()}_${safeName}`;
    const { error } = await supabase.storage.from('project-files').upload(filePath, file);
    if (!error) {
      const { data } = supabase.storage.from('project-files').getPublicUrl(filePath);
      const fileData = { name: file.name, type: file.type, url: data.publicUrl, path: filePath };
      setFiles(prev => ({ ...prev, [taskKey]: fileData })); 
      if(taskKey !== 'auftragsdokument') setTasks(prev => ({ ...prev, [taskKey]: true })); 
    }
    setSyncStatus('saved');
  };

  const removeFile = async (taskKey) => { 
    if (files[taskKey]?.path) await supabase.storage.from('project-files').remove([files[taskKey].path]);
    setFiles(prev => ({ ...prev, [taskKey]: null })); 
    if(taskKey !== 'auftragsdokument') setTasks(prev => ({ ...prev, [taskKey]: false })); 
  };

  const handleExtraFileUpload = async (e) => {
    const selectedFiles = Array.from(e.target.files);
    setSyncStatus('saving');
    const newExtraFiles = [];
    for (const file of selectedFiles) {
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `${currentProjectId || 'temp'}/extra/${Date.now()}_${safeName}`;
      const { error } = await supabase.storage.from('project-files').upload(filePath, file);
      if (!error) {
        const { data } = supabase.storage.from('project-files').getPublicUrl(filePath);
        newExtraFiles.push({ id: Date.now() + Math.random(), name: file.name, type: file.type, url: data.publicUrl, path: filePath });
      }
    }
    setExtraFiles(prev => [...prev, ...newExtraFiles]);
    setSyncStatus('saved');
  };

  const removeExtraFile = async (id) => {
    const fileToRemove = extraFiles.find(f => f.id === id);
    if (fileToRemove?.path) await supabase.storage.from('project-files').remove([fileToRemove.path]);
    setExtraFiles(extraFiles.filter(f => f.id !== id));
  };

  // --- HELPER FUNKTIONEN ---
  const handleAddContact = () => setContacts([...contacts, { id: Date.now(), name: '', position: '', phone: '', email: '' }]);
  const handleContactChange = (id, field, value) => setContacts(contacts.map(c => c.id === id ? { ...c, [field]: value } : c));
  const removeContact = (id) => setContacts(contacts.filter(c => c.id !== id));
  const addVehicle = () => { if (newVehicle.trim() !== '') { setVehicles([...vehicles, newVehicle.trim()]); setNewVehicle(''); setTasks(prev => ({ ...prev, parkausweise: true })); } };
  const removeVehicle = (v) => { const updated = vehicles.filter(veh => veh !== v); setVehicles(updated); if(updated.length === 0) setTasks(prev => ({ ...prev, parkausweise: false })); };
  const addEmployee = () => { if (newEmployee.trim() !== '') { setEmployees([...employees, newEmployee.trim()]); setNewEmployee(''); setTasks(prev => ({ ...prev, mitarbeiter: true })); } };
  const removeEmployee = (emp) => { const updated = employees.filter(e => e !== emp); setEmployees(updated); if(updated.length === 0) setTasks(prev => ({ ...prev, mitarbeiter: false })); };
  const handleLvChange = (id, field, value) => setLvItems(lvItems.map(item => item.id === id ? { ...item, [field]: value } : item));
  const addLvItem = () => setLvItems([...lvItems, { id: Date.now(), pos: `1.${String(lvItems.length + 1).padStart(2, '0')}`, desc: '', price: '' }]);
  const removeLvItem = (id) => setLvItems(lvItems.filter(item => item.id !== id));

  const formatPrice = (id, value) => {
    let num = parseFloat(value.replace(',', '.'));
    if (!isNaN(num)) handleLvChange(id, 'price', num.toLocaleString('de-DE', { minimumFractionDigits: 2 }));
  };

  // --- KALENDER BERECHNUNG ---
  const dateObj = kickoffDate ? new Date(kickoffDate) : null;
  const day = dateObj ? dateObj.getDate().toString().padStart(2, '0') : '--';
  const month = dateObj ? dateObj.toLocaleString('de-DE', { month: 'short' }).toUpperCase() : '--';
  const kw = dateObj ? Math.ceil((((dateObj - new Date(dateObj.getFullYear(), 0, 1)) / 86400000) + 1) / 7) : '--';

  // --- THEME ---
  const theme = {
    bg: isDark ? 'bg-[#121212]' : 'bg-[#e0e5ec]',
    text: isDark ? 'text-gray-200' : 'text-gray-600',
    title: isDark ? 'text-white' : 'text-gray-800',
    card: isDark ? 'bg-[#1e1e1e] border-[#333] shadow-2xl' : 'bg-[#e0e5ec] border-white shadow-[9px_9px_16px_rgba(163,177,198,0.6),-9px_-9px_16px_rgba(255,255,255,0.8)]',
    input: isDark ? 'bg-[#121212] border-[#333] text-white' : 'bg-[#e0e5ec] border-transparent text-gray-800 shadow-inner',
    flipCard: isDark ? 'bg-[#202020] border-[#333]' : 'bg-[#e0e5ec] border-white shadow-md',
  };

  // --- RENDER LOGIN ODER APP ---
  if (!session) {
    return <Login />;
  }

  return (
    <div className={`min-h-screen ${theme.bg} ${theme.text} font-sans selection:bg-green-500/30 transition-colors duration-500`}>
      
      {/* VORSCHAU MODAL */}
      {previewFile && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex flex-col p-4">
          <div className="flex justify-between items-center mb-4 text-white">
            <h3 className="text-xl font-bold">Vorschau: {previewFile.name}</h3>
            <button onClick={() => setPreviewFile(null)} className="p-2 bg-red-500 rounded-full"><X size={24} /></button>
          </div>
          <div className="flex-1 bg-white rounded-xl overflow-hidden">
            {previewFile.type.includes('pdf') ? <iframe src={previewFile.url} className="w-full h-full" /> : <img src={previewFile.url} className="w-full h-full object-contain" />}
          </div>
        </div>
      )}

      {/* SIDEBAR */}
      {isSidebarOpen && <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setIsSidebarOpen(false)}></div>}
      <div className={`fixed top-0 left-0 h-full w-80 z-50 transform transition-transform duration-500 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} ${isDark ? 'bg-[#1a1a1a] border-[#333]' : 'bg-[#e0e5ec] border-white'}`}>
        <div className="p-6 flex justify-between items-center border-b border-gray-500/10">
          <h2 className="font-bold flex items-center gap-2"><Briefcase size={20} className="text-green-500"/> Projekte</h2>
          <button onClick={() => setIsSidebarOpen(false)}><X size={24} /></button>
        </div>
        <div className="p-4 space-y-4 overflow-y-auto h-[calc(100vh-160px)]">
           <button onClick={resetToNewProject} className="w-full py-3 rounded-xl border-2 border-dashed border-gray-500/50 font-bold flex items-center justify-center gap-2 hover:border-green-500 hover:text-green-500"><Plus size={18} /> Neues Projekt</button>
           {projectsList.map(p => (
              <div key={p.id} onClick={() => loadProject(p.id)} className={`p-4 rounded-xl cursor-pointer border relative group ${currentProjectId === p.id ? 'border-green-500' : 'border-gray-500/20'}`}>
                 <h3 className="font-bold truncate pr-6">{p.company_name}</h3>
                 <button onClick={(e) => deleteProject(e, p.id)} className="absolute top-4 right-4 text-red-500 opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                 <div className="text-[10px] mt-2 font-bold uppercase tracking-widest text-green-500">{p.progress_percentage}% Abgeschlossen</div>
              </div>
           ))}
        </div>
        <div className="absolute bottom-0 w-full p-4 border-t border-gray-500/10">
           <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 py-3 bg-red-500/10 text-red-500 rounded-xl font-bold hover:bg-red-500 hover:text-white transition-all"><LogOut size={18} /> Abmelden</button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
        
        {/* HEADER */}
        <div className={`${theme.card} p-8 rounded-3xl border relative overflow-hidden`}>
          <div className="absolute top-0 left-0 w-2 h-full bg-green-500"></div>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4 w-full">
              <button onClick={() => setIsSidebarOpen(true)} className={`p-3 rounded-2xl ${theme.flipCard}`}><Menu size={28} /></button>
              <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} className={`text-4xl md:text-6xl font-black bg-transparent border-none outline-none w-full ${theme.title}`} />
            </div>
            <div className="flex items-center gap-4">
              <button onClick={() => setIsDark(!isDark)} className={`p-3 rounded-full ${theme.flipCard}`}>{isDark ? <Sun className="text-yellow-400" /> : <Moon />}</button>
              <div className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border border-gray-500/20 flex items-center gap-2">
                {syncStatus === 'saving' ? <RefreshCw size={12} className="animate-spin text-blue-500" /> : <CheckCircle2 size={12} className="text-green-500" />}
                {syncStatus === 'saving' ? 'Speichert...' : 'Cloud Sync'}
              </div>
            </div>
          </div>
          {isReadyToStart && (
            <div className="mt-6 bg-green-600 text-white p-3 rounded-xl text-center font-black tracking-widest animate-pulse">🚀 PROJEKT STARTBEREIT</div>
          )}
        </div>

        {/* GRID */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          
          {/* LEFT COLUMN */}
          <div className="space-y-8">
            <div className={`${theme.card} p-6 rounded-3xl border`}>
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2 border-b border-gray-500/10 pb-3"><Building className="text-blue-500" /> Kundenstammdaten</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <input type="text" placeholder="Straße & Hausnummer" value={customerData.street} onChange={e => setCustomerData({...customerData, street: e.target.value})} className={`${theme.input} rounded-xl p-3 outline-none border border-gray-500/10`} />
                <input type="text" placeholder="PLZ & Ort" value={customerData.city} onChange={e => setCustomerData({...customerData, city: e.target.value})} className={`${theme.input} rounded-xl p-3 outline-none border border-gray-500/10`} />
              </div>
              <h3 className="text-xs font-bold uppercase tracking-widest opacity-50 mb-4">Ansprechpartner</h3>
              {contacts.map((contact) => (
                <div key={contact.id} className="flex gap-2 mb-3">
                  <input type="text" placeholder="Name" value={contact.name} onChange={e => handleContactChange(contact.id, 'name', e.target.value)} className={`${theme.input} flex-1 rounded-xl p-2 text-sm outline-none border border-gray-500/10`} />
                  <input type="text" placeholder="Position" value={contact.position} onChange={e => handleContactChange(contact.id, 'position', e.target.value)} className={`${theme.input} flex-1 rounded-xl p-2 text-sm outline-none border border-gray-500/10`} />
                  {contacts.length > 1 && <button onClick={() => removeContact(contact.id)} className="text-red-500 px-2"><X size={16}/></button>}
                </div>
              ))}
              <button onClick={handleAddContact} className="text-blue-500 text-xs font-bold flex items-center gap-1 mt-2"><Plus size={14} /> Kontakt hinzufügen</button>
            </div>

            <div className={`${theme.card} p-6 rounded-3xl border`}>
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2 border-b border-gray-500/10 pb-3"><Receipt className="text-yellow-500" /> Leistungsverzeichnis</h2>
              <div className="space-y-3">
                {lvItems.map((item) => (
                  <div key={item.id} className="flex gap-2 items-center">
                    <span className="text-[10px] font-mono opacity-50 w-8">{item.pos}</span>
                    <input type="text" placeholder="Leistung..." value={item.desc} onChange={e => handleLvChange(item.id, 'desc', e.target.value)} className={`${theme.input} flex-1 rounded-lg p-2 text-sm outline-none border border-gray-500/10`} />
                    <input type="text" placeholder="0,00" value={item.price} onBlur={(e) => formatPrice(item.id, e.target.value)} onChange={e => handleLvChange(item.id, 'price', e.target.value)} className={`${theme.input} w-24 rounded-lg p-2 text-sm text-right outline-none border border-gray-500/10`} />
                    <button onClick={() => removeLvItem(item.id)} className="text-red-500"><Trash2 size={14}/></button>
                  </div>
                ))}
                <button onClick={addLvItem} className="text-yellow-500 text-xs font-bold flex items-center gap-1 mt-2"><Plus size={14} /> Position hinzufügen</button>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-8">
            <div className={`${theme.card} p-6 rounded-3xl border`}>
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2 border-b border-gray-500/10 pb-3"><CalendarIcon className="text-purple-500" /> Projektstart</h2>
              <div className="flex gap-4">
                <div className={`${theme.flipCard} flex-1 p-6 rounded-2xl flex flex-col items-center justify-center border border-gray-500/10`}>
                  <span className="text-5xl font-black">{day}</span>
                  <span className="text-xs font-bold opacity-50">{month}</span>
                </div>
                <div className={`${theme.flipCard} flex-1 p-6 rounded-2xl flex flex-col items-center justify-center border border-gray-500/10`}>
                  <span className="text-5xl font-black">{kw}</span>
                  <span className="text-xs font-bold opacity-50">KW</span>
                </div>
              </div>
              <input type="date" value={kickoffDate} onChange={e => setKickoffDate(e.target.value)} className={`w-full mt-4 ${theme.input} p-3 rounded-xl outline-none border border-gray-500/10`} />
            </div>

            <div className={`${theme.card} p-6 rounded-3xl border`}>
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2 border-b border-gray-500/10 pb-3"><FileText className="text-green-500" /> Checkliste & Dokumente</h2>
              <div className="space-y-4">
                {/* Datensatz Upload */}
                <div className={`p-4 rounded-2xl border flex items-center justify-between ${tasks.datensatz ? 'border-green-500 bg-green-500/5' : 'border-gray-500/10'}`}>
                  <div className="flex items-center gap-3">
                    {tasks.datensatz ? <CheckCircle2 className="text-green-500" /> : <Circle className="opacity-20" />}
                    <span className="font-bold text-sm">Datensatz erhalten</span>
                  </div>
                  {files.datensatz ? (
                    <button onClick={() => removeFile('datensatz')} className="text-red-500 p-2"><Trash2 size={16}/></button>
                  ) : (
                    <label className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold cursor-pointer hover:bg-blue-500 transition-all"><UploadCloud size={14} className="inline mr-1" /> Upload <input type="file" className="hidden" onChange={e => handleFileUpload('datensatz', e)} /></label>
                  )}
                </div>

                {/* Notizen */}
                <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Wichtige Notizen zum Projekt..." className={`w-full ${theme.input} p-4 rounded-2xl text-sm min-h-[120px] outline-none border border-gray-500/10 resize-none`}></textarea>
                
                {/* Extra Files */}
                <div className="mt-4">
                   <div className="flex justify-between items-center mb-2">
                     <span className="text-xs font-bold uppercase opacity-50">Zusatzdokumente</span>
                     <label className="text-blue-500 text-xs font-bold cursor-pointer"><Paperclip size={12} className="inline" /> Datei anhängen <input type="file" multiple className="hidden" onChange={handleExtraFileUpload} /></label>
                   </div>
                   <div className="space-y-2">
                     {extraFiles.map(file => (
                       <div key={file.id} className="flex items-center justify-between p-2 rounded-lg bg-black/10 border border-white/5 text-[10px]">
                         <span className="truncate flex-1 mr-2">{file.name}</span>
                         <div className="flex gap-2">
                           <button onClick={() => setPreviewFile(file)} className="text-blue-500"><Eye size={14}/></button>
                           <button onClick={() => removeExtraFile(file.id)} className="text-red-500"><Trash2 size={14}/></button>
                         </div>
                       </div>
                     ))}
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}