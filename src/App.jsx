import React, { useState, useRef, useEffect } from 'react';
import { CheckCircle2, Circle, Calendar as CalendarIcon, UploadCloud, Plus, Trash2, ChevronDown, ChevronUp, Users, Building, FileText, Wrench, AlertCircle, ShieldCheck, Sun, Moon, Menu, X, Briefcase, Download, Eye, Receipt, MessageSquare, Paperclip, RefreshCw } from 'lucide-react';
import { supabase } from './supabaseClient';

export default function App() {
  // --- STATE MANAGEMENT ---
  const [isDark, setIsDark] = useState(true); 
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState(null); 
  
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

  // --- PFLICHTFELDER PRÜFUNG ---
  const hasValidContact = contacts.some(c => c.name.trim() !== '');
  const isReadyToStart = kickoffDate !== '' && hasValidContact && files.ankuendigung !== null && files.datensatz !== null && tasks.datenimport === true;
  const progressSteps = [hasValidContact, kickoffDate !== '', tasks.parkausweise, tasks.mitarbeiter, files.datensatz !== null, files.ankuendigung !== null, tasks.datenimport];
  const completedSteps = progressSteps.filter(Boolean).length;
  const progressPercentage = Math.round((completedSteps / 7) * 100) || 0;

  // --- AUTO-SYNC MIT DATENBANK ---
  useEffect(() => {
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
  }, [companyName, customerData, contacts, orderDetails, software, repairsApproved, meterInfo, vehicles, employees, tasks, lvItems, notes, kickoffDate, progressPercentage, isReadyToStart, files, extraFiles]);

  const fetchProjectsFromSupabase = async () => {
    const { data } = await supabase.from('projects').select('id, company_name, progress_percentage, is_ready_to_start').order('updated_at', { ascending: false });
    if (data) setProjectsList(data);
  };

  useEffect(() => { fetchProjectsFromSupabase(); }, []);

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

  // --- PROJEKT LÖSCHEN (INKLUSIVE ALLER CLOUD-DATEIEN) ---
  const deleteProject = async (e, id) => {
    e.stopPropagation(); 
    
    if(window.confirm("Projekt wirklich löschen? ACHTUNG: Alle verknüpften Dateien werden endgültig aus der Cloud gelöscht!")) {
      
      // 1. Zuerst holen wir uns alle Datei-Infos des Projekts aus der Datenbank
      const { data: project } = await supabase.from('projects').select('files, extra_files').eq('id', id).single();
      
      let pathsToDelete = [];

      // 2. Wir sammeln die Cloud-Pfade der Haupt-Dateien
      if (project?.files) {
        if (project.files.datensatz?.path) pathsToDelete.push(project.files.datensatz.path);
        if (project.files.ankuendigung?.path) pathsToDelete.push(project.files.ankuendigung.path);
        if (project.files.auftragsdokument?.path) pathsToDelete.push(project.files.auftragsdokument.path);
      }

      // 3. Wir sammeln die Cloud-Pfade der extra hochgeladenen Dokumente
      if (project?.extra_files && Array.isArray(project.extra_files)) {
        project.extra_files.forEach(file => {
          if (file.path) pathsToDelete.push(file.path);
        });
      }

      // 4. Wir löschen alle gesammelten Dateien physisch aus dem Supabase Storage
      if (pathsToDelete.length > 0) {
        await supabase.storage.from('project-files').remove(pathsToDelete);
      }

      // 5. Erst NACHDEM die Dateien weg sind, löschen wir das Projekt aus der Datenbank
      await supabase.from('projects').delete().eq('id', id);
      
      // 6. UI aufräumen
      if(currentProjectId === id) resetToNewProject();
      fetchProjectsFromSupabase();
    }
  };

  const handleAddContact = () => setContacts([...contacts, { id: Date.now(), name: '', position: '', phone: '', email: '' }]);
  const handleContactChange = (id, field, value) => setContacts(contacts.map(c => c.id === id ? { ...c, [field]: value } : c));
  const removeContact = (id) => setContacts(contacts.filter(c => c.id !== id));

  const addVehicle = () => { if (newVehicle.trim() !== '' && !vehicles.includes(newVehicle.trim())) { setVehicles([...vehicles, newVehicle.trim()]); setNewVehicle(''); setTasks(prev => ({ ...prev, parkausweise: true })); } };
  const removeVehicle = (vToRemove) => { const updated = vehicles.filter(v => v !== vToRemove); setVehicles(updated); if(updated.length === 0) setTasks(prev => ({ ...prev, parkausweise: false })); };

  const addEmployee = () => { if (newEmployee.trim() !== '' && !employees.includes(newEmployee.trim())) { setEmployees([...employees, newEmployee.trim()]); setNewEmployee(''); setTasks(prev => ({ ...prev, mitarbeiter: true })); } };
  const removeEmployee = (empToRemove) => { const updated = employees.filter(emp => emp !== empToRemove); setEmployees(updated); if(updated.length === 0) setTasks(prev => ({ ...prev, mitarbeiter: false })); };


  // --- ECHTER DATEI UPLOAD IN DIE CLOUD ---
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
    } else {
      alert("Fehler beim Datei-Upload!");
    }
    setSyncStatus('saved');
  };

  const removeFile = async (taskKey) => { 
    if (files[taskKey]?.path) {
      await supabase.storage.from('project-files').remove([files[taskKey].path]);
    }
    setFiles(prev => ({ ...prev, [taskKey]: null })); 
    if(taskKey !== 'auftragsdokument') setTasks(prev => ({ ...prev, [taskKey]: false })); 
  };

  const handleExtraFileUpload = async (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length === 0) return;

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
    if (fileToRemove?.path) {
      await supabase.storage.from('project-files').remove([fileToRemove.path]);
    }
    setExtraFiles(extraFiles.filter(f => f.id !== id));
  };


  const recalculateLvPositions = (items) => items.map((item, index) => ({ ...item, pos: `1.${String(index + 1).padStart(2, '0')}` }));
  const addLvItem = () => { const newItems = [...lvItems, { id: Date.now(), pos: '', desc: '', price: '' }]; setLvItems(recalculateLvPositions(newItems)); };
  const handleLvChange = (id, field, value) => { setLvItems(lvItems.map(item => item.id === id ? { ...item, [field]: value } : item)); };
  const removeLvItem = (id) => { const remainingItems = lvItems.filter(item => item.id !== id); setLvItems(recalculateLvPositions(remainingItems)); };

  const formatPrice = (id, value, e) => {
    if (e && e.key !== 'Enter' && e.type !== 'blur') return;
    if (!value) return;
    let numStr = value.replace(',', '.');
    if (!isNaN(numStr) && numStr.trim() !== '') {
      let num = parseFloat(numStr);
      let formatted = num.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      handleLvChange(id, 'price', formatted);
    }
  };

  const dateObj = kickoffDate ? new Date(kickoffDate) : null;
  const day = dateObj ? dateObj.getDate().toString().padStart(2, '0') : '--';
  const month = dateObj ? dateObj.toLocaleString('de-DE', { month: 'short' }).toUpperCase() : '--';
  const getWeekNumber = (d) => {
    if (!d) return '--';
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
  };
  const kw = getWeekNumber(dateObj);

  // --- THEME STYLING ---
  const theme = {
    bg: isDark ? 'bg-[#121212]' : 'bg-[#e0e5ec]',
    text: isDark ? 'text-gray-200' : 'text-gray-600',
    title: isDark ? 'text-white' : 'text-gray-800',
    card: isDark ? 'bg-[#1e1e1e] border-[#333] shadow-[8px_8px_16px_rgba(0,0,0,0.4),-8px_-8px_16px_rgba(255,255,255,0.03)]' : 'bg-[#e0e5ec] border-white/50 shadow-[9px_9px_16px_rgb(163,177,198,0.6),-9px_-9px_16px_rgba(255,255,255,0.8)]',
    input: isDark ? 'bg-[#121212] border-[#333] text-white shadow-[inset_4px_4px_8px_rgba(0,0,0,0.5),inset_-4px_-4px_8px_rgba(255,255,255,0.02)]' : 'bg-[#e0e5ec] border-transparent text-gray-800 shadow-[inset_4px_4px_8px_rgba(163,177,198,0.6),inset_-4px_-4px_8px_rgba(255,255,255,0.9)]',
    flipCard: isDark ? 'bg-[#202020] border-[#333] shadow-lg' : 'bg-[#e0e5ec] border-white shadow-[5px_5px_10px_rgba(163,177,198,0.5),-5px_-5px_10px_rgba(255,255,255,0.8)]',
    hover3D: 'transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl',
  };

  return (
    <div className={`min-h-screen ${theme.bg} ${theme.text} font-sans selection:bg-green-500/30 transition-colors duration-500 relative`}>
      
      {/* VORSCHAU MODAL (ABSTURZSICHER) */}
      {previewFile && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex flex-col p-4 md:p-10 transition-opacity duration-300">
          <div className="flex justify-between items-center mb-4 text-white">
            <h3 className="text-xl font-bold flex items-center gap-2"><Eye className="text-blue-400" /> Vorschau: {previewFile?.name || 'Dokument'}</h3>
            <button onClick={() => setPreviewFile(null)} className="p-2 bg-red-500 hover:bg-red-600 rounded-full transition-colors"><X size={24} /></button>
          </div>
          <div className="flex-1 w-full bg-white rounded-xl overflow-hidden shadow-2xl">
            {previewFile?.type?.includes('pdf') ? (
              <iframe src={previewFile.url} className="w-full h-full border-none" title="PDF Vorschau" />
            ) : previewFile?.type?.includes('image') ? (
              <img src={previewFile.url} alt="Vorschau" className="w-full h-full object-contain p-4" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-800 flex-col gap-4">
                <FileText size={64} className="text-gray-400" />
                <p className="text-xl font-bold">Keine Vorschau verfügbar</p>
                <a href={previewFile?.url || '#'} download={previewFile?.name || 'download'} className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2"><Download size={20} /> Datei herunterladen</a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SIDEBAR OVERLAY */}
      {isSidebarOpen && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300" onClick={() => setIsSidebarOpen(false)}></div>}

      {/* SIDEBAR MENÜ */}
      <div className={`fixed top-0 left-0 h-full w-80 z-50 transform transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} ${isDark ? 'bg-[#1a1a1a] border-r border-[#333] shadow-[10px_0_30px_rgba(0,0,0,0.8)]' : 'bg-[#e0e5ec] border-r border-white shadow-[10px_0_30px_rgba(163,177,198,0.5)]'}`}>
        <div className="p-6 flex justify-between items-center border-b border-gray-500/20">
          <h2 className={`text-xl font-bold flex items-center gap-2 ${theme.title}`}><Briefcase size={20} className="text-green-500"/> Alle Projekte</h2>
          <button onClick={() => setIsSidebarOpen(false)} className={`p-2 rounded-full transition-colors hover:scale-110 ${isDark ? 'hover:bg-[#333] text-gray-400' : 'hover:bg-white text-gray-600'}`}><X size={24} /></button>
        </div>
        <div className="p-4 space-y-4 overflow-y-auto h-[calc(100vh-80px)] custom-scrollbar">
           <button onClick={resetToNewProject} className={`w-full py-3 rounded-xl border-2 border-dashed font-bold flex items-center justify-center gap-2 transition-all hover:scale-105 ${isDark ? 'border-[#444] text-gray-400 hover:border-green-500 hover:text-green-500 bg-[#121212]' : 'border-gray-400 text-gray-600 hover:border-green-600 hover:text-green-600 bg-transparent'}`}><Plus size={18} /> Neues Projekt</button>
           
           {projectsList.length === 0 && <p className="text-center text-xs opacity-50 mt-10">Noch keine Projekte in der Datenbank.</p>}
           
           {projectsList.map(p => (
              <div key={p.id} onClick={() => loadProject(p.id)} className={`p-4 rounded-xl cursor-pointer transition-all hover:scale-105 border relative group ${currentProjectId === p.id ? 'border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]' : isDark ? 'border-[#333] hover:border-green-500 bg-[#252525]' : 'border-transparent hover:border-green-500 bg-[#e0e5ec] shadow-[5px_5px_10px_rgba(163,177,198,0.5),-5px_-5px_10px_rgba(255,255,255,0.8)]'}`}>
                 <div className="flex justify-between items-start mb-2">
                   <h3 className={`font-bold truncate pr-6 ${theme.title}`}>{p.company_name}</h3>
                   <button onClick={(e) => deleteProject(e, p.id)} className="absolute top-3 right-3 text-gray-500 hover:text-red-500 hover:scale-110 transition-all opacity-0 group-hover:opacity-100" title="Projekt löschen"><Trash2 size={16} /></button>
                 </div>
                 {p.is_ready_to_start ? (
                    <div className="text-xs font-bold text-green-500 mt-2">Startklar 🚀</div>
                 ) : (
                    <div className="text-xs font-bold opacity-70 mt-2 text-orange-500">In Bearbeitung</div>
                 )}
              </div>
           ))}
        </div>
      </div>

      {/* HAUPTINHALT */}
      <div className="p-4 md:p-8 pb-24">
        <div className="max-w-7xl mx-auto space-y-8">
          
          {/* HEADER */}
          <div className={`${theme.card} p-8 rounded-3xl border relative overflow-hidden transition-colors duration-500 flex flex-col`}>
            <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-green-400 to-green-600 shadow-[0_0_15px_rgba(34,197,94,0.5)]"></div>
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-4 w-full">
                <button onClick={() => setIsSidebarOpen(true)} className={`p-3 rounded-2xl flex-shrink-0 transition-all duration-300 hover:scale-105 ${isDark ? 'bg-[#2a2a2a] text-white shadow-[inset_2px_2px_5px_rgba(0,0,0,0.5)]' : 'bg-white text-gray-800 shadow-[5px_5px_10px_rgba(163,177,198,0.5),-5px_-5px_10px_rgba(255,255,255,0.8)]'}`}><Menu size={28} /></button>
                <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} className={`text-4xl md:text-6xl lg:text-7xl font-extrabold bg-transparent border-none outline-none w-full truncate ${isDark ? 'text-white' : 'text-gray-800 drop-shadow-md'}`} placeholder="Firmenname..." />
              </div>
              
              <div className="flex flex-col items-end gap-3 flex-shrink-0">
                 <button onClick={() => setIsDark(!isDark)} className={`p-3 rounded-full transition-all duration-300 ${isDark ? 'bg-[#2a2a2a] text-yellow-400 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.5)]' : 'bg-white text-gray-800 shadow-[5px_5px_10px_rgba(163,177,198,0.5),-5px_-5px_10px_rgba(255,255,255,0.8)]'}`}>
                   {isDark ? <Sun size={24} /> : <Moon size={24} />}
                 </button>
                 
                 <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border ${isDark ? 'bg-[#121212] border-[#333]' : 'bg-white border-gray-300'}`}>
                    {syncStatus === 'saving' ? (
                      <><RefreshCw size={12} className="animate-spin text-blue-500" /> <span className="opacity-70">Cloud-Sync...</span></>
                    ) : syncStatus === 'error' ? (
                      <><AlertCircle size={12} className="text-red-500" /> <span className="opacity-70 text-red-500">Speicherfehler</span></>
                    ) : (
                      <><CheckCircle2 size={12} className="text-green-500" /> <span className="opacity-70 text-green-500">Gespeichert</span></>
                    )}
                 </div>
              </div>
            </div>
            
            {/* LET'S GO BANNER */}
            {isReadyToStart ? (
               <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-3 rounded-xl flex items-center justify-center gap-2 font-black tracking-widest shadow-[0_0_20px_rgba(34,197,94,0.4)] my-4 mb-2">
                 🚀 LET'S GO! AUFTRAG IST ZUM START FREIGEGEBEN
               </div>
            ) : (
               <div className="flex items-center gap-2 uppercase tracking-widest text-sm font-bold opacity-80 mt-4 mb-2">
                 <span className="text-green-500">▶</span> Projekt Onboarding & Stammdaten
               </div>
            )}
          </div>

          {/* HAUPT-GRID: 2 SPALTEN */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            
            {/* --- LINKE SPALTE --- */}
            <div className="space-y-8">
              
              {/* KUNDENSTAMMDATEN */}
              <div className={`${theme.card} rounded-3xl p-6 border ${theme.hover3D}`}>
                <h2 className={`${theme.title} text-xl font-bold mb-6 flex items-center gap-2 border-b ${isDark ? 'border-[#333]' : 'border-gray-300'} pb-3`}>
                  <Building className="text-blue-500 drop-shadow-md" /> Kundenstammdaten
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <input type="text" placeholder="Straße & Hausnummer" value={customerData.street} onChange={e => setCustomerData({...customerData, street: e.target.value})} className={`${theme.input} rounded-xl p-3 outline-none transition-all`} />
                  <input type="text" placeholder="PLZ & Ort" value={customerData.city} onChange={e => setCustomerData({...customerData, city: e.target.value})} className={`${theme.input} rounded-xl p-3 outline-none transition-all`} />
                  <input type="text" placeholder="Telefon" value={customerData.phone} onChange={e => setCustomerData({...customerData, phone: e.target.value})} className={`${theme.input} rounded-xl p-3 outline-none transition-all`} />
                  <input type="email" placeholder="E-Mail" value={customerData.email} onChange={e => setCustomerData({...customerData, email: e.target.value})} className={`${theme.input} rounded-xl p-3 outline-none transition-all`} />
                </div>

                <div className="mt-8">
                  <h3 className="text-sm font-bold uppercase tracking-wider mb-4 flex items-center justify-between opacity-70">
                    <span>Ansprechpartner</span>
                    {!hasValidContact && <span className="text-red-500 text-xs flex items-center gap-1"><AlertCircle size={14}/> Pflichtfeld</span>}
                  </h3>
                  {contacts.map((contact, index) => (
                    <div key={contact.id} className={`${isDark ? 'bg-[#252525]' : 'bg-[#e0e5ec] shadow-[inset_3px_3px_6px_rgba(163,177,198,0.5)]'} p-4 rounded-2xl mb-4 relative group transition-colors`}>
                      {index > 0 && (
                        <button onClick={() => removeContact(contact.id)} className="absolute -top-3 -right-3 bg-red-500 text-white p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 hover:scale-110 transition-all">
                          <Trash2 size={16} />
                        </button>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input type="text" placeholder="Name *" value={contact.name} onChange={e => handleContactChange(contact.id, 'name', e.target.value)} className={`${theme.input} ${contact.name === '' ? '!border-red-500' : ''} border rounded-xl p-2 text-sm outline-none`} />
                        <input type="text" placeholder="Position" value={contact.position} onChange={e => handleContactChange(contact.id, 'position', e.target.value)} className={`${theme.input} rounded-xl p-2 text-sm outline-none border`} />
                      </div>
                    </div>
                  ))}
                  <button onClick={handleAddContact} className="text-blue-500 font-bold flex items-center gap-1 hover:scale-105 transition-transform mt-2">
                    <Plus size={18} /> Weiteren Ansprechpartner hinzufügen
                  </button>
                </div>
              </div>

              {/* AUFTRAGSÜBERSICHT */}
              <div className={`${theme.card} rounded-3xl p-6 border ${theme.hover3D}`}>
                <h2 className={`${theme.title} text-xl font-bold mb-6 flex items-center gap-2 border-b ${isDark ? 'border-[#333]' : 'border-gray-300'} pb-3`}>
                  <Wrench className="text-orange-500 drop-shadow-md" /> Auftragsübersicht
                </h2>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs uppercase tracking-wider mb-2 font-bold opacity-70">Software</label>
                      <div className={`flex gap-2 p-1 rounded-xl ${isDark ? 'bg-[#121212] shadow-inner' : 'bg-[#e0e5ec] shadow-[inset_3px_3px_6px_rgba(163,177,198,0.5)]'}`}>
                        <button onClick={() => setSoftware('komtex')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${software === 'komtex' ? 'bg-orange-500 text-white shadow-md transform scale-105' : 'opacity-60 hover:opacity-100'}`}>Komtex</button>
                        <button onClick={() => setSoftware('fremd')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${software === 'fremd' ? 'bg-blue-600 text-white shadow-md transform scale-105' : 'opacity-60 hover:opacity-100'}`}>Fremdsoftware</button>
                      </div>
                    </div>
                    <div>
                       <label className="block text-xs uppercase tracking-wider mb-2 font-bold opacity-70">Reparaturen</label>
                       <div className={`flex gap-2 p-1 rounded-xl ${isDark ? 'bg-[#121212] shadow-inner' : 'bg-[#e0e5ec] shadow-[inset_3px_3px_6px_rgba(163,177,198,0.5)]'}`}>
                        <button onClick={() => setRepairsApproved(true)} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${repairsApproved === true ? 'bg-green-600 text-white shadow-md transform scale-105' : 'opacity-60 hover:opacity-100'}`}>Genehmigt</button>
                        <button onClick={() => setRepairsApproved(false)} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${repairsApproved === false ? 'bg-red-600 text-white shadow-md transform scale-105' : 'opacity-60 hover:opacity-100'}`}>Abgelehnt</button>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                     {['Eichaustausch', 'Funkumrüstung', 'Sonstiges'].map((item, idx) => {
                       const key = ['eichaustausch', 'funkumruestung', 'other'][idx];
                       const isActive = orderDetails[key];
                       return (
                          <button key={key} onClick={() => setOrderDetails({...orderDetails, [key]: !isActive})} className={`py-3 rounded-xl text-sm font-bold transition-all border ${isActive ? 'bg-orange-500 text-white border-orange-400 shadow-[0_5px_15px_rgba(249,115,22,0.4)] transform -translate-y-1' : `${theme.input} hover:-translate-y-1 hover:shadow-md`}`}>
                            {item}
                          </button>
                       )
                     })}
                  </div>
                  <div className={`p-4 rounded-2xl ${isDark ? 'bg-[#252525]' : 'bg-[#e0e5ec] shadow-[inset_4px_4px_8px_rgba(163,177,198,0.5)]'}`}>
                    <h3 className="text-sm font-bold mb-4 opacity-80">Zählerinformationen</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <input type="text" placeholder="Neu: Hersteller" value={meterInfo.newManufacturer} onChange={e => setMeterInfo({...meterInfo, newManufacturer: e.target.value})} className={`${theme.input} border rounded-lg p-2 text-xs outline-none`} />
                      <input type="text" placeholder="Neu: Typ" value={meterInfo.newType} onChange={e => setMeterInfo({...meterInfo, newType: e.target.value})} className={`${theme.input} border rounded-lg p-2 text-xs outline-none`} />
                      <input type="text" placeholder="Alt verbaut" value={meterInfo.currentInstalled} onChange={e => setMeterInfo({...meterInfo, currentInstalled: e.target.value})} className={`${theme.input} border rounded-lg p-2 text-xs outline-none`} />
                    </div>
                  </div>
                </div>
              </div>

              {/* LEISTUNGSVERZEICHNIS (LV) */}
              <div className={`${theme.card} rounded-3xl p-6 border ${theme.hover3D}`}>
                <h2 className={`${theme.title} text-xl font-bold mb-6 flex items-center justify-between border-b ${isDark ? 'border-[#333]' : 'border-gray-300'} pb-3`}>
                  <div className="flex items-center gap-2"><Receipt className="text-yellow-500 drop-shadow-md" /> Leistungsverzeichnis</div>
                </h2>
                <div className="space-y-3">
                  <div className="flex gap-2 text-xs font-bold uppercase tracking-wider opacity-60 px-2">
                    <div className="w-16">Pos.</div>
                    <div className="flex-1">Beschreibung</div>
                    <div className="w-24 text-right">Wert</div>
                    <div className="w-8"></div>
                  </div>

                  {lvItems.map((item) => (
                    <div key={item.id} className="flex gap-2 items-center group">
                      <input type="text" value={item.pos} readOnly className={`w-16 ${theme.input} rounded-lg p-2 text-sm outline-none text-center font-bold opacity-70 cursor-default`} />
                      <input type="text" placeholder="Leistungsbeschreibung..." value={item.desc} onChange={e => handleLvChange(item.id, 'desc', e.target.value)} className={`flex-1 ${theme.input} rounded-lg p-2 text-sm outline-none`} />
                      <input type="text" placeholder="z.B. 100,00" value={item.price} onChange={e => handleLvChange(item.id, 'price', e.target.value)} onBlur={(e) => formatPrice(item.id, item.price, e)} onKeyDown={(e) => formatPrice(item.id, item.price, e)} className={`w-24 ${theme.input} rounded-lg p-2 text-sm outline-none text-right`} />
                      <button onClick={() => removeLvItem(item.id)} className="w-8 h-8 flex items-center justify-center text-red-500 hover:bg-red-500/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={16}/></button>
                    </div>
                  ))}
                  <button onClick={addLvItem} className="text-yellow-500 font-bold flex items-center gap-1 hover:scale-105 transition-transform mt-4 text-sm"><Plus size={16} /> Weitere Position hinzufügen</button>
                </div>
              </div>

            </div>

            {/* --- RECHTE SPALTE --- */}
            <div className="space-y-8">

              {/* KICK-OFF TERMIN */}
              <div className={`${theme.card} rounded-3xl p-6 border ${theme.hover3D} relative`}>
                <h2 className={`${theme.title} text-xl font-bold mb-6 flex items-center justify-between border-b ${isDark ? 'border-[#333]' : 'border-gray-300'} pb-3`}>
                  <span className="flex items-center gap-2"><CalendarIcon className="text-purple-500 drop-shadow-md" /> Start</span>
                  {kickoffDate === '' && <span className="text-red-500 text-xs flex items-center gap-1"><AlertCircle size={14}/> Pflicht</span>}
                </h2>
                <div className="relative group hover:scale-[1.03] transition-transform duration-300">
                  {kickoffDate && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-600 to-purple-500 text-white text-sm font-bold px-5 py-1.5 rounded-full z-20 shadow-[0_5px_15px_rgba(168,85,247,0.5)] border border-purple-400">
                      Kalenderwoche {kw}
                    </div>
                  )}
                  
                  <div className="flex gap-3 mt-2 pointer-events-none">
                    <div className={`${theme.flipCard} rounded-2xl p-6 flex flex-col items-center justify-center flex-1 relative overflow-hidden`}>
                      <div className="absolute top-1/2 left-0 w-full h-[2px] bg-black/20 z-10 shadow-sm"></div>
                      <span className={`text-6xl font-black tracking-tight z-0 ${theme.title}`}>{day}</span>
                    </div>
                    <div className={`${theme.flipCard} rounded-2xl p-6 flex flex-col items-center justify-center flex-1 relative overflow-hidden`}>
                      <div className="absolute top-1/2 left-0 w-full h-[2px] bg-black/20 z-10 shadow-sm"></div>
                      <span className={`text-5xl font-black tracking-tight z-0 ${theme.title}`}>{month}</span>
                    </div>
                  </div>

                  <input 
                    type="date" 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-50 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                    onChange={(e) => setKickoffDate(e.target.value)}
                  />
                  <p className="text-center mt-4 text-sm font-bold opacity-60 group-hover:text-purple-500 transition-colors pointer-events-none">Klicken zum Datum wählen</p>
                </div>
              </div>

              {/* STATISCHE CHECKLISTE */}
              <div className={`${theme.card} rounded-3xl p-6 border ${theme.hover3D}`}>
                 <h2 className={`${theme.title} text-xl font-bold mb-6 flex items-center gap-2 border-b ${isDark ? 'border-[#333]' : 'border-gray-300'} pb-3`}>
                  <FileText className="text-green-500 drop-shadow-md" /> Checkliste
                </h2>
                <div className="space-y-4">
                  
                  {/* 1. Parkausweise */}
                  <div className={`border rounded-2xl overflow-hidden transition-all duration-300 ${tasks.parkausweise ? 'border-green-500/50 bg-green-500/5' : `${isDark ? 'border-[#333] bg-[#252525]' : 'border-gray-300 bg-white'}`}`}>
                    <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-black/5" onClick={() => setExpandedCard(expandedCard === 'park' ? null : 'park')}>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex items-center gap-3">
                           {tasks.parkausweise ? <CheckCircle2 className="text-green-500 shadow-sm rounded-full shrink-0" /> : <Circle className="text-gray-500 shrink-0" />}
                           <span className="font-bold">Parkausweise / Kennzeichen</span>
                        </div>
                        {vehicles.length > 0 && (
                          <div className="flex flex-wrap gap-1 sm:ml-4">
                            {vehicles.slice(0, 3).map(v => (
                              <span key={v} className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${isDark ? 'bg-[#121212] border-[#444] text-gray-300' : 'bg-white border-gray-300 text-gray-600'}`}>{v}</span>
                            ))}
                            {vehicles.length > 3 && (
                              <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${isDark ? 'bg-[#121212] border-[#444] text-gray-300' : 'bg-white border-gray-300 text-gray-600'}`}>+{vehicles.length - 3}</span>
                            )}
                          </div>
                        )}
                      </div>
                      {expandedCard === 'park' ? <ChevronUp size={20} className="opacity-60 shrink-0" /> : <ChevronDown size={20} className="opacity-60 shrink-0" />}
                    </div>
                    {expandedCard === 'park' && (
                      <div className={`p-4 border-t ${isDark ? 'border-[#333] bg-[#1a1a1a]' : 'border-gray-200 bg-gray-50'}`}>
                        <div className="flex gap-2 mb-4">
                          <input type="text" placeholder="Kennzeichen (z.B. M-AB 123)" value={newVehicle} onChange={e => setNewVehicle(e.target.value)} onKeyDown={e => e.key === 'Enter' && addVehicle()} className={`flex-1 ${theme.input} border rounded-xl p-2 text-sm outline-none`} />
                          <button onClick={addVehicle} className="bg-green-600 hover:bg-green-500 text-white px-4 rounded-xl text-sm font-bold transition-colors">Hinzufügen</button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {vehicles.map((v, i) => (
                             <span key={i} className={`flex items-center gap-1 border px-3 py-1 rounded-md text-xs font-mono font-bold group ${isDark ? 'border-[#444] bg-[#222]' : 'border-gray-300 bg-white'}`}>
                               {v} <button onClick={() => removeVehicle(v)} className="opacity-50 hover:opacity-100 hover:text-red-500 ml-1"><X size={12}/></button>
                             </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 2. Mitarbeiterausweise */}
                  <div className={`border rounded-2xl overflow-hidden transition-all duration-300 ${tasks.mitarbeiter ? 'border-green-500/50 bg-green-500/5' : `${isDark ? 'border-[#333] bg-[#252525]' : 'border-gray-300 bg-white'}`}`}>
                    <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-black/5" onClick={() => setExpandedCard(expandedCard === 'mitarbeiter' ? null : 'mitarbeiter')}>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex items-center gap-3">
                           {tasks.mitarbeiter ? <CheckCircle2 className="text-green-500 shadow-sm rounded-full shrink-0" /> : <Circle className="text-gray-500 shrink-0" />}
                           <span className="font-bold">Mitarbeiterausweise</span>
                        </div>
                        {employees.length > 0 && (
                          <div className="flex flex-wrap gap-1 sm:ml-4">
                            {employees.slice(0, 3).map(emp => (
                              <span key={emp} className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border flex items-center gap-1 ${isDark ? 'bg-[#121212] border-[#444] text-gray-300' : 'bg-white border-gray-300 text-gray-600'}`}><Users size={10}/> {emp}</span>
                            ))}
                            {employees.length > 3 && (
                              <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${isDark ? 'bg-[#121212] border-[#444] text-gray-300' : 'bg-white border-gray-300 text-gray-600'}`}>+{employees.length - 3}</span>
                            )}
                          </div>
                        )}
                      </div>
                      {expandedCard === 'mitarbeiter' ? <ChevronUp size={20} className="opacity-60 shrink-0" /> : <ChevronDown size={20} className="opacity-60 shrink-0" />}
                    </div>
                    {expandedCard === 'mitarbeiter' && (
                      <div className={`p-4 border-t ${isDark ? 'border-[#333] bg-[#1a1a1a]' : 'border-gray-200 bg-gray-50'}`}>
                        <div className="flex gap-2 mb-4">
                          <input type="text" placeholder="Name des Mitarbeiters" value={newEmployee} onChange={e => setNewEmployee(e.target.value)} onKeyDown={e => e.key === 'Enter' && addEmployee()} className={`flex-1 ${theme.input} border rounded-xl p-2 text-sm outline-none`} />
                          <button onClick={addEmployee} className="bg-green-600 hover:bg-green-500 text-white px-4 rounded-xl text-sm font-bold transition-colors">Hinzufügen</button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {employees.map((emp, i) => (
                             <span key={i} className={`flex items-center gap-1 border px-3 py-1 rounded-md text-xs font-bold group ${isDark ? 'border-[#444] bg-[#222]' : 'border-gray-300 bg-white'}`}>
                               <Users size={12}/> {emp} 
                               <button onClick={() => removeEmployee(emp)} className="opacity-50 hover:opacity-100 hover:text-red-500 ml-1"><X size={12}/></button>
                             </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 3. Datensatz */}
                  <div className={`p-4 rounded-2xl border transition-all duration-300 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-4 ${tasks.datensatz ? 'border-green-500 bg-green-500/10' : `border-red-400/50 ${isDark ? 'bg-[#252525]' : 'bg-white'}`}`}>
                    <div className="flex items-center gap-3">
                      {tasks.datensatz ? <CheckCircle2 className="text-green-500 shadow-sm rounded-full" /> : <AlertCircle className="text-red-500" />}
                      <span className="font-bold">Datensatz erhalten</span>
                    </div>
                    {files?.datensatz ? (
                      <div className={`flex flex-wrap items-center gap-2 px-3 py-1.5 rounded-lg ${theme.input}`}>
                        <span className="text-xs text-green-500 font-bold truncate max-w-[100px]">{files.datensatz?.name || 'Datei'}</span>
                        <div className="flex gap-1 ml-auto">
                           <a href={files.datensatz?.url || '#'} download={files.datensatz?.name || 'download'} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors" title="Herunterladen"><Download size={14}/></a>
                           <button onClick={() => removeFile('datensatz')} className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded transition-colors" title="Löschen"><Trash2 size={14}/></button>
                        </div>
                      </div>
                    ) : (
                      <label className={`flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer text-sm font-bold transition-all hover:scale-105 shadow-md ${isDark ? 'bg-[#333] hover:bg-[#444] text-white' : 'bg-white border text-gray-800'}`}>
                        <UploadCloud size={16} /> Upload <input type="file" className="hidden" onChange={(e) => handleFileUpload('datensatz', e)} />
                      </label>
                    )}
                  </div>

                  {/* 4. Ankündigung */}
                  <div className={`p-4 rounded-2xl border transition-all duration-300 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-4 ${tasks.ankuendigung ? 'border-green-500 bg-green-500/10' : `border-red-400/50 ${isDark ? 'bg-[#252525]' : 'bg-white'}`}`}>
                    <div className="flex items-center gap-3">
                      {tasks.ankuendigung ? <CheckCircle2 className="text-green-500 shadow-sm rounded-full" /> : <AlertCircle className="text-red-500" />}
                      <span className="font-bold">Ankündigung freigegeben</span>
                    </div>
                    {files?.ankuendigung ? (
                      <div className={`flex flex-wrap items-center gap-2 px-3 py-1.5 rounded-lg ${theme.input}`}>
                        <span className="text-xs text-green-500 font-bold truncate max-w-[100px]">{files.ankuendigung?.name || 'Datei'}</span>
                        <div className="flex gap-1 ml-auto">
                           <button onClick={() => setPreviewFile(files.ankuendigung)} className="p-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors" title="Vorschau ansehen"><Eye size={14}/></button>
                           <a href={files.ankuendigung?.url || '#'} download={files.ankuendigung?.name || 'download'} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-[#444] hover:bg-gray-500 text-white rounded transition-colors" title="Herunterladen"><Download size={14}/></a>
                           <button onClick={() => removeFile('ankuendigung')} className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded transition-colors" title="Löschen"><Trash2 size={14}/></button>
                        </div>
                      </div>
                    ) : (
                      <label className={`flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer text-sm font-bold transition-all hover:scale-105 shadow-md ${isDark ? 'bg-[#333] hover:bg-[#444] text-white' : 'bg-white border text-gray-800'}`}>
                        <UploadCloud size={16} /> Upload <input type="file" className="hidden" accept=".pdf" onChange={(e) => handleFileUpload('ankuendigung', e)} />
                      </label>
                    )}
                  </div>

                  {/* 5. Import */}
                  <div onClick={() => setTasks(prev => ({ ...prev, datenimport: !prev.datenimport }))} className={`p-4 rounded-2xl border transition-all duration-300 shadow-sm flex items-center justify-between cursor-pointer hover:scale-[1.02] ${tasks.datenimport ? 'border-green-500 bg-green-500/10' : `border-red-400/50 ${isDark ? 'bg-[#252525]' : 'bg-white'}`}`}>
                    <div className="flex items-center gap-3">
                      {tasks.datenimport ? <CheckCircle2 className="text-green-500 shadow-sm rounded-full" /> : <AlertCircle className="text-red-500" />}
                      <span className="font-bold">Datensatz importiert</span>
                    </div>
                    {!tasks.datenimport && <span className="text-xs opacity-60 font-bold">Klicken zum Abhaken</span>}
                  </div>
                </div>
              </div>

              {/* NOTIZEN & ZUSATZDOKUMENTE */}
              <div className={`${theme.card} rounded-3xl p-6 border ${theme.hover3D}`}>
                <h2 className={`${theme.title} text-xl font-bold mb-6 flex items-center gap-2 border-b ${isDark ? 'border-[#333]' : 'border-gray-300'} pb-3`}>
                  <MessageSquare className="text-pink-500 drop-shadow-md" /> Notizen & Dokumente
                </h2>
                <textarea placeholder="Projekt-Infos, Absprachen, Codes für den Schlüsseltresor..." value={notes} onChange={(e) => setNotes(e.target.value)} className={`w-full ${theme.input} rounded-xl p-4 text-sm outline-none resize-none min-h-[120px] mb-6`}></textarea>
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-bold uppercase tracking-wider opacity-70">Zusätzliche Dateien</span>
                    <label className={`flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer text-xs font-bold transition-all hover:scale-105 shadow-md ${isDark ? 'bg-[#333] hover:bg-[#444] text-white' : 'bg-white border text-gray-800'}`}>
                      <Paperclip size={14} /> Hinzufügen <input type="file" multiple className="hidden" onChange={handleExtraFileUpload} />
                    </label>
                  </div>
                  <div className="space-y-2">
                    {extraFiles?.length === 0 && <p className="text-xs opacity-50 italic">Noch keine Dokumente hochgeladen.</p>}
                    {extraFiles?.map(file => (
                       <div key={file.id} className={`flex items-center justify-between p-2 rounded-lg border ${isDark ? 'bg-[#1a1a1a] border-[#333]' : 'bg-gray-50 border-gray-200'}`}>
                          <span className="text-xs font-bold truncate max-w-[200px]">{file?.name || 'Dokument'}</span>
                          <div className="flex gap-1">
                             {(file?.type?.includes('pdf') || file?.type?.includes('image')) && (
                               <button onClick={() => setPreviewFile(file)} className="p-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors" title="Vorschau ansehen"><Eye size={12}/></button>
                             )}
                             <a href={file?.url || '#'} download={file?.name || 'download'} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-[#444] hover:bg-gray-500 text-white rounded transition-colors" title="Herunterladen"><Download size={12}/></a>
                             <button onClick={() => removeExtraFile(file.id)} className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded transition-colors" title="Löschen"><Trash2 size={12}/></button>
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