import React, { useState, useRef, useEffect } from 'react';
import { CheckCircle2, Circle, Calendar as CalendarIcon, UploadCloud, Plus, Trash2, ChevronDown, ChevronUp, Users, Building, FileText, Wrench, AlertCircle, Sun, Moon, Menu, X, Briefcase, Download, Eye, Receipt, MessageSquare, Paperclip, RefreshCw, User, Phone, Mail, LogOut, Lock, Car, IdCard, MapPin, Map, Package, Home, FileDown } from 'lucide-react';
import { supabase } from './supabaseClient';
import { jsPDF } from 'jspdf';

// --- STANDARD-DATEN POOL ---
const defaultEmployees = ['Jonas Berger', 'Valentin Pechmann', 'Vitus Berger', 'Georg Jedryka', 'Matthias Märsch'];
const defaultVehicles = ['PAF MT 216', 'PAF MT 223', 'PAF MT 209', 'PAF MT 215'];

export default function App() {
  // --- AUTH STATE ---
  const [session, setSession] = useState(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  // --- APP STATE MANAGEMENT ---
  const [isDark, setIsDark] = useState(true); 
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showHome, setShowHome] = useState(true); 
  const [isTransitioning, setIsTransitioning] = useState(false); 
  const [previewFile, setPreviewFile] = useState(null); 
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false); 
  
  const [currentProjectId, setCurrentProjectId] = useState(null);
  const [syncStatus, setSyncStatus] = useState('saved'); 
  const [projectsList, setProjectsList] = useState([]); 
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // --- FORMULAR STATES ---
  const [companyName, setCompanyName] = useState('Neues Projekt');
  const [customerData, setCustomerData] = useState({ street: '', city: '', phone: '', email: '' });
  const [contacts, setContacts] = useState([{ id: 1, name: '', position: '', phone: '', email: '' }]);
  const [orderDetails, setOrderDetails] = useState({ quantity: '', conditions: '', eichaustausch: false, funkumruestung: false, other: false, oldMeterDisposal: null, storageLocation: null, storageAddress: '' });
  const [software, setSoftware] = useState(null);
  const [repairsApproved, setRepairsApproved] = useState(null);
  const [meterInfo, setMeterInfo] = useState({ newManufacturer: '', newType: '', currentInstalled: '' });
  
  const [vehicles, setVehicles] = useState([]);
  const [employees, setEmployees] = useState([]);
  
  const [newVehicle, setNewVehicle] = useState('');
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

  // --- AUTH EFFEKTE ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');
    const { error } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password: authPassword,
    });
    if (error) setAuthError('Login fehlgeschlagen. Bitte Zugangsdaten prüfen.');
    setAuthLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // --- AUTO-SYNC MIT DATENBANK ---
  useEffect(() => {
    if (!session || isInitialLoad || showHome) { setIsInitialLoad(false); return; }
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
  }, [companyName, customerData, contacts, orderDetails, software, repairsApproved, meterInfo, vehicles, employees, tasks, lvItems, notes, kickoffDate, progressPercentage, isReadyToStart, files, extraFiles, session, showHome]);

  const fetchProjectsFromSupabase = async () => {
    if (!session) return;
    const { data } = await supabase.from('projects').select('id, company_name, progress_percentage, is_ready_to_start, kickoff_date');
    if (data) {
      const sortedData = data.sort((a, b) => {
        if (!a.kickoff_date) return 1;
        if (!b.kickoff_date) return -1;
        return new Date(a.kickoff_date) - new Date(b.kickoff_date);
      });
      setProjectsList(sortedData);
    }
  };

  useEffect(() => { 
    if(session) fetchProjectsFromSupabase(); 
  }, [session]);

  const loadProject = async (id) => {
    const { data } = await supabase.from('projects').select('*').eq('id', id).single();
    if (data) {
      setCurrentProjectId(data.id);
      setCompanyName(data.company_name || 'Unbekannt'); 
      setCustomerData(data.customer_data || { street: '', city: '', phone: '', email: '' }); 
      setContacts(data.contacts || [{ id: 1, name: '', position: '', phone: '', email: '' }]); 
      setOrderDetails(data.order_details || { quantity: '', conditions: '', eichaustausch: false, funkumruestung: false, other: false, oldMeterDisposal: null, storageLocation: null, storageAddress: '' }); 
      setSoftware(data.software || null); 
      setRepairsApproved(data.repairs_approved ?? null); 
      setMeterInfo(data.meter_info || { newManufacturer: '', newType: '', currentInstalled: '' }); 
      
      setVehicles(data.vehicles && data.vehicles.length > 0 ? data.vehicles : defaultVehicles); 
      setEmployees(data.employees && data.employees.length > 0 ? data.employees : defaultEmployees); 
      
      setTasks(data.tasks || { parkausweise: false, mitarbeiter: false, datensatz: false, ankuendigung: false, datenimport: false }); 
      setLvItems(data.lv_items || [{ id: Date.now(), pos: '1.01', desc: 'Zählertausch Standard', price: '' }]); 
      setNotes(data.notes || ''); 
      setKickoffDate(data.kickoff_date || '');
      setFiles(data.files || { datensatz: null, ankuendigung: null, auftragsdokument: null });
      setExtraFiles(data.extra_files || []);
    }
  };

  const resetToNewProject = () => {
    setCurrentProjectId(null); 
    setCompanyName('Neues Projekt'); 
    setCustomerData({ street: '', city: '', phone: '', email: '' }); 
    setContacts([{ id: 1, name: '', position: '', phone: '', email: '' }]); 
    setOrderDetails({ quantity: '', conditions: '', eichaustausch: false, funkumruestung: false, other: false, oldMeterDisposal: null, storageLocation: null, storageAddress: '' }); 
    setSoftware(null); 
    setRepairsApproved(null); 
    setMeterInfo({ newManufacturer: '', newType: '', currentInstalled: '' }); 
    setVehicles([]); 
    setEmployees([]); 
    setTasks({ parkausweise: false, mitarbeiter: false, datensatz: false, ankuendigung: false, datenimport: false }); 
    setLvItems([{ id: Date.now(), pos: '1.01', desc: 'Zählertausch Standard', price: '' }]); 
    setNotes(''); 
    setKickoffDate(''); 
    setFiles({ datensatz: null, ankuendigung: null, auftragsdokument: null }); 
    setExtraFiles([]);
  };

  const navigateTo = (destination, id = null) => {
    setIsSidebarOpen(false); 
    setIsTransitioning(true); 
    setTimeout(() => {
      if (destination === 'project') {
        loadProject(id);
        setShowHome(false);
      } else if (destination === 'new') {
        resetToNewProject();
        setShowHome(false);
      } else if (destination === 'home') {
        setShowHome(true);
      }
      setTimeout(() => setIsTransitioning(false), 50);
    }, 300); 
  };

  const deleteProject = async (e, id) => {
    e.stopPropagation(); 
    if(window.confirm("Projekt wirklich löschen? ACHTUNG: Alle verknüpften Dateien werden endgültig aus der Cloud gelöscht!")) {
      const { data: project } = await supabase.from('projects').select('files, extra_files').eq('id', id).single();
      let pathsToDelete = [];
      if (project?.files) {
        if (project.files.datensatz?.path) pathsToDelete.push(project.files.datensatz.path);
        if (project.files.ankuendigung?.path) pathsToDelete.push(project.files.ankuendigung.path);
        if (project.files.auftragsdokument?.path) pathsToDelete.push(project.files.auftragsdokument.path);
      }
      if (project?.extra_files && Array.isArray(project.extra_files)) {
        project.extra_files.forEach(file => { if (file.path) pathsToDelete.push(file.path); });
      }
      if (pathsToDelete.length > 0) { await supabase.storage.from('project-files').remove(pathsToDelete); }
      await supabase.from('projects').delete().eq('id', id);
      if(currentProjectId === id) resetToNewProject();
      fetchProjectsFromSupabase();
    }
  };

  // --- KUNDEN-PDF GENERATOR ---
  const generateCustomerPDF = async () => {
    setIsGeneratingPdf(true);
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();

      try {
        const img = new Image();
        img.src = '/Messtex_Icon_Logo_RGB.png';
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });
        doc.addImage(img, 'PNG', 15, 15, 20, 20);
      } catch (e) {
        console.warn('Logo konnte nicht geladen werden.');
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(30, 41, 59);
      doc.text('Projekt-Onboarding', 40, 25);
      
      doc.setFontSize(14);
      doc.setTextColor(100, 116, 139);
      doc.text('Stammdaten & technische Vorbereitung', 40, 32);

      doc.setDrawColor(226, 232, 240);
      doc.line(15, 42, pageWidth - 15, 42);

      let y = 55;

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('1. Allgemeine Projektdaten', 15, y);
      
      y += 10;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(`Kunde / Projekt:`, 15, y); 
      doc.setFont('helvetica', 'bold');
      doc.text(companyName !== 'Neues Projekt' ? companyName : '____________________________________', 55, y);
      
      y += 8;
      doc.setFont('helvetica', 'normal');
      doc.text(`Anschrift:`, 15, y); 
      doc.setFont('helvetica', 'bold');
      const addressText = customerData.street || customerData.city ? `${customerData.street}, ${customerData.city}`.replace(/^,\s/, '').replace(/,\s$/, '') : '____________________________________';
      doc.text(addressText, 55, y);

      y += 15;

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('2. Wichtige Ansprechpartner', 15, y);
      
      y += 10;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text('Ansprechpartner Technik:', 15, y); 
      doc.setDrawColor(148, 163, 184); 
      doc.line(65, y+1, 195, y+1); 
      y += 8;
      doc.text('Tel.:', 65, y); doc.line(75, y+1, 125, y+1);
      doc.text('E-Mail:', 130, y); doc.line(145, y+1, 195, y+1);

      y += 12;
      doc.text('Ansprechpartner IT / EDV:', 15, y); 
      doc.line(65, y+1, 195, y+1); 
      y += 8;
      doc.text('Tel.:', 65, y); doc.line(75, y+1, 125, y+1);
      doc.text('E-Mail:', 130, y); doc.line(145, y+1, 195, y+1);

      y += 15;

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('3. Technische Rahmenbedingungen', 15, y);
      
      y += 10;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      
      doc.text('Art der Maßnahme:', 15, y);
      doc.rect(60, y-3, 4, 4); doc.text('Eichaustausch', 67, y);
      doc.rect(100, y-3, 4, 4); doc.text('Funkumrüstung', 107, y);
      doc.rect(140, y-3, 4, 4); doc.text('Sonstiges', 147, y);
      
      y += 12;
      doc.text('Reparaturen genehmigt?', 15, y);
      doc.rect(65, y-3, 4, 4); doc.text('Ja', 72, y);
      doc.rect(85, y-3, 4, 4); doc.text('Nein', 92, y);
      doc.rect(110, y-3, 4, 4); doc.text('Nach Rücksprache', 117, y);
      
      y += 12;
      doc.text('Eingesetzte Software:', 15, y);
      doc.rect(60, y-3, 4, 4); doc.text('Komtex', 67, y);
      doc.rect(90, y-3, 4, 4); doc.text('Fremdsoftware:', 97, y); 
      doc.line(125, y+1, 195, y+1);
      
      y += 12;
      doc.text('Lagerort des Materials:', 15, y); 
      doc.line(60, y+1, 195, y+1); 
      
      y += 15;

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('4. Zeitplan & Datenaustausch', 15, y);
      
      y += 10;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');

      doc.text('Gewünschter Start:', 15, y); 
      doc.line(50, y+1, 100, y+1); 
      doc.text('Abschluss bis:', 110, y); 
      doc.line(140, y+1, 195, y+1); 
      
      y += 12;
      doc.text('Datenübergabeformat:', 15, y);
      doc.rect(60, y-3, 4, 4); doc.text('Excel', 67, y);
      doc.rect(85, y-3, 4, 4); doc.text('CSV', 92, y);
      doc.rect(110, y-3, 4, 4); doc.text('XML', 117, y);
      doc.rect(135, y-3, 4, 4); doc.text('JSON', 142, y);
      
      y += 15;

      if(employees.length > 0 || vehicles.length > 0) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('5. Benötigte Ausweise & Zugänge', 15, y);
        
        y += 8;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text('Bitte stellen Sie für unser Team im Vorfeld folgende Ausweise / Parkberechtigungen aus:', 15, y);
        doc.setTextColor(15, 23, 42);
        
        y += 8;
        if(employees.length > 0) {
           doc.setFont('helvetica', 'bold');
           doc.text('Mitarbeiter:', 15, y);
           doc.setFont('helvetica', 'normal');
           const splitEmp = doc.splitTextToSize(employees.join(', '), 140);
           doc.text(splitEmp, 40, y);
           y += (splitEmp.length * 6) + 4;
        }
        if(vehicles.length > 0) {
           doc.setFont('helvetica', 'bold');
           doc.text('Kennzeichen:', 15, y);
           doc.setFont('helvetica', 'normal');
           const splitVeh = doc.splitTextToSize(vehicles.join(', '), 140);
           doc.text(splitVeh, 45, y);
           y += (splitVeh.length * 6) + 4;
        }
      }

      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.text('Bitte füllen Sie dieses Formular aus und senden es an: info@messtex.de', 15, 280);

      const safeFileName = companyName === 'Neues Projekt' ? 'Kunden_Fragebogen' : `Kunden_Fragebogen_${companyName.replace(/[^a-zA-Z0-9]/g, '_')}`;
      doc.save(`${safeFileName}.pdf`);

    } catch (error) {
      console.error("Fehler beim PDF generieren:", error);
      alert("Fehler beim Erstellen der PDF.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleAddContact = () => setContacts([...contacts, { id: Date.now(), name: '', position: '', phone: '', email: '' }]);
  const handleContactChange = (id, field, value) => setContacts(contacts.map(c => c.id === id ? { ...c, [field]: value } : c));
  const removeContact = (id) => setContacts(contacts.filter(c => c.id !== id));

  const toggleVehicle = (v) => {
    if (vehicles.includes(v)) { setVehicles(vehicles.filter(item => item !== v)); } 
    else { setVehicles([...vehicles, v]); }
  };
  const addCustomVehicle = () => {
    if (newVehicle.trim() !== '' && !vehicles.includes(newVehicle.trim())) {
      setVehicles([...vehicles, newVehicle.trim()]);
      setNewVehicle('');
    }
  };

  const toggleEmployee = (emp) => {
    if (employees.includes(emp)) { setEmployees(employees.filter(e => e !== emp)); } 
    else { setEmployees([...employees, emp]); }
  };
  const addCustomEmployee = () => {
    if (newEmployee.trim() !== '' && !employees.includes(newEmployee.trim())) {
      setEmployees([...employees, newEmployee.trim()]);
      setNewEmployee('');
    }
  };

  const handleToggleTask = (taskKey, e) => {
    e.stopPropagation(); 
    setTasks(prev => ({ ...prev, [taskKey]: !prev[taskKey] }));
  };

  const handleFileUpload = async (taskKey, e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSyncStatus('saving');
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${currentProjectId || 'temp'}/${taskKey}/${Date.now()}_${safeName}`;
    const { error } = await supabase.storage.from('project-files').upload(filePath, file);
    if (!error) {
      const { data } = supabase.storage.from('project-files').getPublicUrl(filePath);
      setFiles(prev => ({ ...prev, [taskKey]: { name: file.name, type: file.type, url: data.publicUrl, path: filePath } })); 
      if(taskKey !== 'auftragsdokument') setTasks(prev => ({ ...prev, [taskKey]: true })); 
    } else { alert("Fehler beim Datei-Upload!"); }
    setSyncStatus('saved');
  };

  const removeFile = async (taskKey) => { 
    if (files[taskKey]?.path) { await supabase.storage.from('project-files').remove([files[taskKey].path]); }
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
    if (fileToRemove?.path) { await supabase.storage.from('project-files').remove([fileToRemove.path]); }
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

  const getWeekNumber = (d) => {
    if (!d) return '--';
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
  };

  const dateObj = kickoffDate ? new Date(kickoffDate) : null;
  const day = dateObj ? dateObj.getDate().toString().padStart(2, '0') : '--';
  const month = dateObj ? dateObj.toLocaleString('de-DE', { month: 'short' }).toUpperCase() : '--';
  const kw = getWeekNumber(dateObj);

  // --- THEME STYLING (APPLE GLASSMORPHISM ABDUNKELUNG LIGHT-MODE) ---
  const theme = {
    bg: isDark ? 'bg-[#09090b]' : 'bg-slate-200', 
    text: isDark ? 'text-slate-200' : 'text-slate-700',
    title: isDark ? 'text-white' : 'text-slate-900',
    card: isDark 
      ? 'bg-white/[0.04] backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]' 
      : 'bg-white/40 backdrop-blur-2xl border border-white/40 shadow-[0_8px_32px_0_rgba(31,38,135,0.05)]',
    input: isDark 
      ? 'bg-black/20 border border-white/10 text-white placeholder-white/30 focus:bg-black/40 focus:border-green-500/50 focus:ring-1 focus:ring-green-500/50 transition-all' 
      : 'bg-white/40 border border-white/50 text-slate-800 placeholder-slate-500 focus:bg-white/60 focus:border-green-500/50 focus:ring-1 focus:ring-green-500/50 transition-all',
    flipCard: isDark 
      ? 'bg-white/5 border border-white/10 backdrop-blur-md shadow-lg' 
      : 'bg-white/50 border border-white/50 backdrop-blur-md shadow-lg',
    hover3D: 'transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_15px_40px_-5px_rgba(0,0,0,0.3)] hover:bg-white/[0.06]',
  };

  const transitionClass = `transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] transform ${isTransitioning ? 'opacity-0 translate-y-8 scale-[0.98] blur-[2px]' : 'opacity-100 translate-y-0 scale-100 blur-0'}`;

  // ==========================================
  // VIEW 1: LOGIN SCREEN
  // ==========================================
  if (!session) {
    return (
      <div className={`min-h-screen ${theme.bg} ${theme.text} font-sans flex items-center justify-center p-4 transition-colors duration-700 relative z-0`}>
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-[-1]">
          <div className={`absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full blur-[120px] mix-blend-screen transition-all duration-1000 ${isDark ? 'bg-green-500/20' : 'bg-green-500/20'}`}></div>
          <div className={`absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full blur-[120px] mix-blend-screen transition-all duration-1000 ${isDark ? 'bg-blue-600/20' : 'bg-blue-500/20'}`}></div>
        </div>
        <div className={`${theme.card} p-8 rounded-3xl w-full max-w-md relative overflow-hidden`}>
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 to-blue-500 opacity-80"></div>
          <div className="flex flex-col items-center mb-8 mt-4">
            <div className={`p-5 rounded-full mb-4 flex items-center justify-center ${isDark ? 'bg-white/5 border border-white/10' : 'bg-white/50 border border-white/50 shadow-sm'}`}>
              <img src="/Messtex_Icon_Logo_RGB.png" alt="Messtex Logo" className="h-12 w-12 object-contain drop-shadow-md" />
            </div>
            <h2 className={`text-2xl font-black ${theme.title}`}>Projekt Portal</h2>
            <p className="text-sm opacity-60 mt-2">Bitte melde dich an, um fortzufahren</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            {authError && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm p-3 rounded-xl flex items-center gap-2 backdrop-blur-md">
                <AlertCircle size={16} /> {authError}
              </div>
            )}
            <div className="relative">
              <User size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 opacity-50" />
              <input type="email" placeholder="E-Mail Adresse" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} required className={`w-full ${theme.input} rounded-xl pl-10 pr-4 py-3 outline-none`} />
            </div>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 opacity-50" />
              <input type="password" placeholder="Passwort" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} required className={`w-full ${theme.input} rounded-xl pl-10 pr-4 py-3 outline-none`} />
            </div>
            <button type="submit" disabled={authLoading} className="w-full bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white font-bold py-3 rounded-xl transition-all hover:-translate-y-0.5 shadow-[0_5px_20px_rgba(34,197,94,0.3)] disabled:opacity-50 disabled:hover:translate-y-0 mt-4 border border-green-400/50">
              {authLoading ? 'Lade...' : 'Anmelden'}
            </button>
          </form>
          <button onClick={() => setIsDark(!isDark)} className="absolute top-4 right-4 p-2 opacity-40 hover:opacity-100 transition-opacity">
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 2: DASHBOARD (HOME SCREEN)
  // ==========================================
  if (showHome) {
    return (
      <div className={`min-h-screen ${theme.bg} ${theme.text} font-sans selection:bg-green-500/30 transition-colors duration-700 p-4 md:p-8 overflow-x-hidden relative z-0`}>
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-[-1]">
          <div className={`absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full blur-[120px] mix-blend-screen transition-all duration-1000 ${isDark ? 'bg-green-500/15' : 'bg-green-500/20'}`}></div>
          <div className={`absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full blur-[120px] mix-blend-screen transition-all duration-1000 ${isDark ? 'bg-blue-500/15' : 'bg-blue-500/20'}`}></div>
        </div>
        <div className={`max-w-7xl mx-auto space-y-8 ${transitionClass}`}>
          <div className={`${theme.card} p-6 md:p-8 rounded-3xl border relative overflow-hidden transition-colors duration-500 flex flex-col md:flex-row md:items-center justify-between gap-4 z-10`}>
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-400 to-blue-600 opacity-80"></div>
            <h1 className={`text-3xl md:text-4xl font-black flex items-center gap-4 ml-4 ${theme.title}`}>
              <img src="/Messtex_Icon_Logo_RGB.png" alt="Messtex Logo" className="h-10 w-10 object-contain drop-shadow-lg" />
              Projekt Übersicht
            </h1>
            <div className="flex items-center gap-3">
              <button onClick={() => setIsDark(!isDark)} className={`p-3 rounded-2xl transition-all duration-300 hover:scale-105 ${isDark ? 'bg-white/5 border border-white/10 text-yellow-400 hover:bg-white/10' : 'bg-white/40 border border-white/40 text-slate-800 hover:bg-white/60'}`} title="Theme wechseln">
                {isDark ? <Sun size={22} /> : <Moon size={22} />}
              </button>
              <button onClick={handleLogout} className={`p-3 rounded-2xl transition-all duration-300 hover:scale-105 hover:text-red-500 ${isDark ? 'bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10' : 'bg-white/40 border border-white/40 text-slate-600 hover:bg-white/60'}`} title="Abmelden">
                <LogOut size={22} />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div onClick={() => navigateTo('new')} className={`${theme.card} p-8 rounded-3xl border border-dashed flex flex-col items-center justify-center cursor-pointer transition-all duration-300 hover:scale-105 group min-h-[220px] ${isDark ? 'border-white/20 hover:border-green-500 hover:bg-white/[0.06]' : 'border-slate-400 hover:border-green-500 hover:bg-white/50'}`}>
               <Plus size={56} className="text-slate-400/50 group-hover:text-green-500 transition-colors mb-4 drop-shadow-md" />
               <span className="font-bold text-lg text-slate-500 group-hover:text-green-500 transition-colors uppercase tracking-wider">Neues Projekt</span>
            </div>
            {projectsList.map(p => {
               const pDate = p.kickoff_date ? new Date(p.kickoff_date) : null;
               const pDay = pDate ? pDate.getDate().toString().padStart(2, '0') : '--';
               const pMonth = pDate ? pDate.toLocaleString('de-DE', { month: 'short' }).toUpperCase() : '--';
               const pKw = getWeekNumber(pDate);
               return (
                 <div key={p.id} onClick={() => navigateTo('project', p.id)} className={`${theme.card} p-6 rounded-3xl transition-all duration-500 hover:scale-105 hover:-translate-y-1 hover:bg-white/[0.06] cursor-pointer relative group flex flex-col justify-between min-h-[220px]`}>
                    <button onClick={(e) => deleteProject(e, p.id)} className="absolute top-4 right-4 p-2 text-slate-500 hover:bg-red-500/20 hover:text-red-400 rounded-xl opacity-0 group-hover:opacity-100 transition-all z-20">
                      <Trash2 size={20} />
                    </button>
                    <div>
                       <h3 className={`font-black text-2xl mb-4 pr-10 truncate ${theme.title}`}>{p.company_name}</h3>
                       <div className="flex items-center justify-between gap-2 flex-wrap">
                         {p.is_ready_to_start ? (
                            <span className="inline-flex items-center gap-1.5 bg-green-500/10 text-green-500 border border-green-500/20 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm backdrop-blur-md"><CheckCircle2 size={12}/> Startklar</span>
                         ) : (
                            <span className="inline-flex items-center gap-1.5 bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm backdrop-blur-md"><Circle size={12}/> In Bearbeitung</span>
                         )}
                         {pDate ? (
                           <div className="flex items-center gap-1.5 ml-auto">
                             <span className="text-[10px] font-bold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-1 rounded-full uppercase tracking-wider backdrop-blur-md">KW {pKw}</span>
                             <div className={`flex gap-0.5 p-0.5 rounded-lg border shadow-sm backdrop-blur-md ${isDark ? 'bg-black/40 border-white/10' : 'bg-white/50 border-white/40'}`}>
                               <div className={`w-6 h-6 flex items-center justify-center rounded overflow-hidden relative ${theme.flipCard}`}>
                                 <div className="absolute top-1/2 left-0 w-full h-[1px] bg-black/20 z-10"></div>
                                 <span className="text-[10px] font-black z-0">{pDay}</span>
                               </div>
                               <div className={`w-6 h-6 flex items-center justify-center rounded overflow-hidden relative ${theme.flipCard}`}>
                                 <div className="absolute top-1/2 left-0 w-full h-[1px] bg-black/20 z-10"></div>
                                 <span className="text-[9px] font-black z-0">{pMonth}</span>
                               </div>
                             </div>
                           </div>
                         ) : (
                           <span className="text-[9px] font-bold opacity-40 ml-auto uppercase tracking-wider mt-1">Kein Startdatum</span>
                         )}
                       </div>
                    </div>
                    <div className="mt-6">
                       <div className="flex justify-between text-xs font-bold opacity-60 mb-2 uppercase tracking-wider">
                         <span>Fortschritt</span>
                         <span className={p.progress_percentage === 100 ? 'text-green-500' : ''}>{p.progress_percentage || 0}%</span>
                       </div>
                       <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-black/50 border border-white/5' : 'bg-slate-300 shadow-inner'}`}>
                         <div className={`h-full transition-all duration-1000 ${p.progress_percentage === 100 ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]'}`} style={{ width: `${p.progress_percentage || 0}%` }}></div>
                       </div>
                    </div>
                 </div>
               );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 3: PROJECT DETAIL SCREEN
  // ==========================================
  return (
    <div className={`min-h-screen ${theme.bg} ${theme.text} font-sans selection:bg-green-500/30 transition-colors duration-700 relative overflow-x-hidden z-0`}>
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-[-1]">
        <div className={`absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full blur-[120px] mix-blend-screen transition-all duration-1000 ${isDark ? 'bg-green-500/15' : 'bg-green-500/20'}`}></div>
        <div className={`absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full blur-[120px] mix-blend-screen transition-all duration-1000 ${isDark ? 'bg-blue-500/15' : 'bg-blue-500/20'}`}></div>
      </div>

      {previewFile && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xl z-[100] flex flex-col p-4 md:p-10 transition-opacity duration-300">
          <div className="flex justify-between items-center mb-4 text-white">
            <h3 className="text-xl font-bold flex items-center gap-2"><Eye className="text-blue-400" /> Vorschau: {previewFile?.name || 'Dokument'}</h3>
            <button onClick={() => setPreviewFile(null)} className="p-2 bg-white/10 hover:bg-red-500 rounded-full transition-colors border border-white/20"><X size={24} /></button>
          </div>
          <div className="flex-1 w-full bg-white/10 rounded-2xl overflow-hidden shadow-2xl border border-white/20 backdrop-blur-md">
            {previewFile?.type?.includes('pdf') ? (
              <iframe src={previewFile.url} className="w-full h-full border-none" title="PDF Vorschau" />
            ) : previewFile?.type?.includes('image') ? (
              <img src={previewFile.url} alt="Vorschau" className="w-full h-full object-contain p-4" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white flex-col gap-4">
                <FileText size={64} className="opacity-50" />
                <p className="text-xl font-bold">Keine Vorschau verfügbar</p>
                <a href={previewFile?.url || '#'} download={previewFile?.name || 'download'} className="mt-4 bg-blue-500 hover:bg-blue-400 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg"><Download size={20} /> Datei herunterladen</a>
              </div>
            )}
          </div>
        </div>
      )}

      {isSidebarOpen && <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-300" onClick={() => setIsSidebarOpen(false)}></div>}

      <div className={`fixed top-0 left-0 h-full w-80 z-50 transform transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} ${isDark ? 'bg-black/60 backdrop-blur-3xl border-r border-white/10 shadow-[20px_0_40px_rgba(0,0,0,0.5)]' : 'bg-slate-200/90 backdrop-blur-3xl border-r border-white/40 shadow-[20px_0_40px_rgba(0,0,0,0.05)]'}`}>
        <div className="p-6 flex justify-between items-center border-b border-white/10">
          <h2 className={`text-xl font-bold flex items-center gap-3 ${theme.title}`}>
            <img src="/Messtex_Icon_Logo_RGB.png" alt="Logo" className="h-6 w-6 object-contain" /> Projekte
          </h2>
          <button onClick={() => setIsSidebarOpen(false)} className={`p-2 rounded-full transition-colors hover:scale-110 ${isDark ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-white/40 text-slate-600'}`}><X size={24} /></button>
        </div>
        <div className="p-4 space-y-4 overflow-y-auto h-[calc(100vh-80px)] custom-scrollbar">
           <button onClick={() => navigateTo('home')} className={`w-full py-3 rounded-xl border font-bold flex items-center justify-center gap-2 transition-all hover:scale-105 shadow-sm backdrop-blur-md ${isDark ? 'border-white/10 bg-white/5 hover:bg-white/10 text-white' : 'border-white/40 bg-white/30 hover:border-slate-400 hover:bg-white/50 text-slate-800'}`}>
             <Home size={18} /> Zurück zur Übersicht
           </button>
           <div className="my-4 border-b border-white/10"></div>
           <button onClick={() => navigateTo('new')} className={`w-full py-3 rounded-xl border border-dashed font-bold flex items-center justify-center gap-2 transition-all hover:scale-105 ${isDark ? 'border-white/20 text-slate-300 hover:border-green-500 hover:text-green-400 hover:bg-white/5' : 'border-slate-400 text-slate-600 hover:border-green-600 hover:text-green-600 hover:bg-white/40'}`}><Plus size={18} /> Neues Projekt</button>
           {projectsList.length === 0 && <p className="text-center text-xs opacity-50 mt-10">Noch keine Projekte in der Datenbank.</p>}
           {projectsList.map(p => (
              <div key={p.id} onClick={() => navigateTo('project', p.id)} className={`p-4 rounded-xl cursor-pointer transition-all hover:scale-105 border relative group flex flex-col justify-between backdrop-blur-md ${currentProjectId === p.id ? 'border-blue-500 bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.2)]' : isDark ? 'border-white/5 bg-white/5 hover:border-white/20 hover:bg-white/10' : 'border-white/40 bg-white/30 hover:border-slate-400 hover:bg-white/50'}`}>
                 <div className="flex justify-between items-start mb-2">
                   <h3 className={`font-bold truncate pr-6 ${theme.title}`}>{p.company_name}</h3>
                   <button onClick={(e) => deleteProject(e, p.id)} className="absolute top-3 right-3 text-slate-500 hover:text-red-400 hover:scale-110 transition-all opacity-0 group-hover:opacity-100" title="Projekt löschen"><Trash2 size={16} /></button>
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

      <div className={`p-4 md:p-8 pb-24 ${transitionClass}`}>
        <div className="max-w-7xl mx-auto space-y-8">
          
          {/* HEADER */}
          <div className={`${theme.card} p-6 md:p-8 rounded-3xl border relative overflow-hidden transition-colors duration-500 flex flex-col`}>
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-green-400 to-green-600 opacity-80"></div>
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-4 w-full">
                <button onClick={() => navigateTo('home')} className={`p-3 rounded-2xl flex-shrink-0 transition-all duration-300 hover:scale-105 ${isDark ? 'bg-white/5 text-white border border-white/10 hover:bg-white/10' : 'bg-white/40 text-slate-800 border border-white/40 hover:bg-white/60'}`} title="Zurück zur Übersicht"><Home size={22} /></button>
                <button onClick={() => setIsSidebarOpen(true)} className={`p-3 rounded-2xl flex-shrink-0 transition-all duration-300 hover:scale-105 ${isDark ? 'bg-white/5 text-white border border-white/10 hover:bg-white/10' : 'bg-white/40 text-slate-800 border border-white/40 hover:bg-white/60'}`} title="Projekte Menü"><Menu size={22} /></button>
                <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} className={`text-4xl md:text-5xl lg:text-6xl font-extrabold bg-transparent border-none outline-none w-full truncate placeholder-slate-500/50 ${isDark ? 'text-white' : 'text-slate-800'}`} placeholder="Firmenname..." />
              </div>
              
              <div className="flex flex-col items-end gap-3 flex-shrink-0">
                 <div className="flex items-center gap-2">
                   
                   <button 
                      onClick={generateCustomerPDF} 
                      disabled={isGeneratingPdf}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-full font-bold text-sm transition-all duration-300 ${isDark ? 'bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-500/30' : 'bg-blue-500/10 text-blue-700 hover:bg-blue-500/20 border border-blue-400/30'} shadow-sm backdrop-blur-md disabled:opacity-50`}
                      title="Kunden-Fragebogen herunterladen"
                   >
                     {isGeneratingPdf ? <RefreshCw size={16} className="animate-spin" /> : <FileDown size={16} />}
                     <span className="hidden sm:inline">{isGeneratingPdf ? 'Erstelle PDF...' : 'Kunden-Fragebogen (PDF)'}</span>
                   </button>

                   <button onClick={() => setIsDark(!isDark)} className={`p-2.5 rounded-full transition-all duration-300 hover:scale-110 ${isDark ? 'bg-white/5 border border-white/10 text-yellow-400 hover:bg-white/10' : 'bg-white/40 border border-white/40 text-slate-800 hover:bg-white/60'}`} title="Theme wechseln">
                     {isDark ? <Sun size={20} /> : <Moon size={20} />}
                   </button>
                   <button onClick={handleLogout} className={`p-2.5 rounded-full transition-all duration-300 hover:scale-110 hover:text-red-500 ${isDark ? 'bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10' : 'bg-white/40 border border-white/40 text-slate-600 hover:bg-white/60'}`} title="Abmelden">
                     <LogOut size={20} />
                   </button>
                 </div>
                 
                 <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border backdrop-blur-md ${isDark ? 'bg-black/30 border-white/10' : 'bg-white/40 border-slate-300 text-slate-700'}`}>
                    {syncStatus === 'saving' ? (
                      <><RefreshCw size={12} className="animate-spin text-blue-400" /> <span className="opacity-70">Cloud-Sync...</span></>
                    ) : syncStatus === 'error' ? (
                      <><AlertCircle size={12} className="text-red-500" /> <span className="opacity-70 text-red-500">Speicherfehler</span></>
                    ) : (
                      <><CheckCircle2 size={12} className="text-green-600" /> <span className="opacity-70 text-green-600">Gespeichert</span></>
                    )}
                 </div>
              </div>
            </div>
            
            {/* LET'S GO BANNER */}
            {isReadyToStart ? (
               <div className="bg-gradient-to-r from-green-500/90 to-green-600/90 backdrop-blur-md border border-green-400/30 text-white p-3 rounded-xl flex items-center justify-center gap-2 font-black tracking-widest shadow-[0_5px_20px_rgba(34,197,94,0.3)] my-4 mb-2">
                 🚀 LET'S GO! AUFTRAG IST ZUM START FREIGEGEBEN
               </div>
            ) : (
               <div className="flex items-center gap-2 uppercase tracking-widest text-sm font-bold opacity-70 mt-4 mb-2">
                 <span className="text-green-600">▶</span> Projekt Onboarding & Stammdaten
               </div>
            )}
          </div>

          {/* HAUPT-GRID: 2 SPALTEN */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            
            {/* --- LINKE SPALTE --- */}
            <div className="space-y-8">
              
              {/* KUNDENSTAMMDATEN */}
              <div className={`${theme.card} rounded-3xl p-6 md:p-8 ${theme.hover3D}`}>
                <h2 className={`${theme.title} text-xl font-bold mb-6 flex items-center gap-2 border-b ${isDark ? 'border-white/10' : 'border-slate-300/50'} pb-4`}>
                  <Building className="text-blue-500" /> Kundenstammdaten
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="relative">
                    <MapPin size={16} className="absolute left-4 top-1/2 transform -translate-y-1/2 opacity-50" />
                    <input type="text" placeholder="Straße & Hausnummer" value={customerData.street} onChange={e => setCustomerData({...customerData, street: e.target.value})} className={`w-full ${theme.input} rounded-xl pl-10 pr-4 py-3 outline-none`} />
                  </div>
                  <div className="relative">
                    <Map size={16} className="absolute left-4 top-1/2 transform -translate-y-1/2 opacity-50" />
                    <input type="text" placeholder="PLZ & Ort" value={customerData.city} onChange={e => setCustomerData({...customerData, city: e.target.value})} className={`w-full ${theme.input} rounded-xl pl-10 pr-4 py-3 outline-none`} />
                  </div>
                  <div className="relative">
                    <Phone size={16} className="absolute left-4 top-1/2 transform -translate-y-1/2 opacity-50" />
                    <input type="text" placeholder="Telefon" value={customerData.phone} onChange={e => setCustomerData({...customerData, phone: e.target.value})} className={`w-full ${theme.input} rounded-xl pl-10 pr-4 py-3 outline-none`} />
                  </div>
                  <div className="relative">
                    <Mail size={16} className="absolute left-4 top-1/2 transform -translate-y-1/2 opacity-50" />
                    <input type="email" placeholder="E-Mail" value={customerData.email} onChange={e => setCustomerData({...customerData, email: e.target.value})} className={`w-full ${theme.input} rounded-xl pl-10 pr-4 py-3 outline-none`} />
                  </div>
                </div>

                <div className="mt-8">
                  <h3 className="text-sm font-bold uppercase tracking-wider mb-4 flex items-center justify-between opacity-70">
                    <span>Ansprechpartner</span>
                    {!hasValidContact && <span className="text-red-500 text-xs flex items-center gap-1"><AlertCircle size={14}/> Pflichtfeld</span>}
                  </h3>
                  {contacts.map((contact, index) => (
                    <div key={contact.id} className={`${isDark ? 'bg-black/20 border-white/5' : 'bg-white/30 border-white/40'} border p-5 rounded-2xl mb-4 relative group transition-colors`}>
                      {index > 0 && (
                        <button onClick={() => removeContact(contact.id)} className="absolute -top-3 -right-3 bg-red-500/90 backdrop-blur-md text-white p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 hover:scale-110 transition-all border border-red-400/50">
                          <Trash2 size={16} />
                        </button>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="relative">
                          <User size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 opacity-50" />
                          <input type="text" placeholder="Name *" value={contact.name} onChange={e => handleContactChange(contact.id, 'name', e.target.value)} className={`w-full ${theme.input} ${contact.name === '' ? '!border-red-400/50 focus:!border-red-400' : ''} rounded-xl pl-9 pr-3 py-2.5 text-sm outline-none`} />
                        </div>
                        <div className="relative">
                          <Briefcase size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 opacity-50" />
                          <input type="text" placeholder="Position" value={contact.position} onChange={e => handleContactChange(contact.id, 'position', e.target.value)} className={`w-full ${theme.input} rounded-xl pl-9 pr-3 py-2.5 text-sm outline-none`} />
                        </div>
                        <div className="relative">
                          <Phone size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 opacity-50" />
                          <input type="text" placeholder="Telefon" value={contact.phone} onChange={e => handleContactChange(contact.id, 'phone', e.target.value)} className={`w-full ${theme.input} rounded-xl pl-9 pr-3 py-2.5 text-sm outline-none`} />
                        </div>
                        <div className="relative">
                          <Mail size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 opacity-50" />
                          <input type="email" placeholder="E-Mail" value={contact.email} onChange={e => handleContactChange(contact.id, 'email', e.target.value)} className={`w-full ${theme.input} rounded-xl pl-9 pr-3 py-2.5 text-sm outline-none`} />
                        </div>
                      </div>
                    </div>
                  ))}
                  <button onClick={handleAddContact} className="text-blue-600 font-bold flex items-center gap-1 hover:text-blue-500 transition-colors mt-2 text-sm">
                    <Plus size={16} /> Weiteren Ansprechpartner hinzufügen
                  </button>
                </div>
              </div>

              {/* AUFTRAGSÜBERSICHT */}
              <div className={`${theme.card} rounded-3xl p-6 md:p-8 ${theme.hover3D}`}>
                <h2 className={`${theme.title} text-xl font-bold mb-6 flex items-center gap-2 border-b ${isDark ? 'border-white/10' : 'border-slate-300/50'} pb-4`}>
                  <Wrench className="text-orange-500" /> Auftragsübersicht
                </h2>
                <div className="space-y-6">
                  
                  {/* ZEILE 1: Software & Reparaturen */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs uppercase tracking-wider mb-2 font-bold opacity-70 pl-1">Software</label>
                      <div className={`flex gap-2 p-1.5 rounded-xl ${isDark ? 'bg-black/30 border border-white/5' : 'bg-slate-300/40 border border-slate-300/50'}`}>
                        <button onClick={() => setSoftware('komtex')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all duration-300 ${software === 'komtex' ? 'bg-orange-500/90 text-white shadow-md scale-[1.02] border border-orange-400/50' : 'opacity-60 hover:opacity-100 hover:bg-white/10'}`}>Komtex</button>
                        <button onClick={() => setSoftware('fremd')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all duration-300 ${software === 'fremd' ? 'bg-blue-600/90 text-white shadow-md scale-[1.02] border border-blue-500/50' : 'opacity-60 hover:opacity-100 hover:bg-white/10'}`}>Fremd</button>
                      </div>
                    </div>
                    <div>
                       <label className="block text-xs uppercase tracking-wider mb-2 font-bold opacity-70 pl-1">Reparaturen</label>
                       <div className={`flex gap-2 p-1.5 rounded-xl ${isDark ? 'bg-black/30 border border-white/5' : 'bg-slate-300/40 border border-slate-300/50'}`}>
                        <button onClick={() => setRepairsApproved(true)} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all duration-300 ${repairsApproved === true ? 'bg-green-600/90 text-white shadow-md scale-[1.02] border border-green-500/50' : 'opacity-60 hover:opacity-100 hover:bg-white/10'}`}>Genehmigt</button>
                        <button onClick={() => setRepairsApproved(false)} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all duration-300 ${repairsApproved === false ? 'bg-red-600/90 text-white shadow-md scale-[1.02] border border-red-500/50' : 'opacity-60 hover:opacity-100 hover:bg-white/10'}`}>Abgelehnt</button>
                      </div>
                    </div>
                  </div>
                  
                  {/* ZEILE 2: Leistungsumfang */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                     {['Eichaustausch', 'Funkumrüstung', 'Sonstiges'].map((item, idx) => {
                       const key = ['eichaustausch', 'funkumruestung', 'other'][idx];
                       const isActive = orderDetails[key];
                       return (
                          <button key={key} onClick={() => setOrderDetails({...orderDetails, [key]: !isActive})} className={`py-3 rounded-xl text-sm font-bold transition-all duration-300 border ${isActive ? 'bg-orange-500/90 text-white border-orange-400/50 shadow-[0_5px_15px_rgba(249,115,22,0.2)] transform -translate-y-0.5' : `${theme.input} hover:-translate-y-0.5`}`}>
                            {item}
                          </button>
                       )
                     })}
                  </div>

                  {/* ZEILE 3: Lagerung & Altzähler */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                    <div>
                      <label className="block text-xs uppercase tracking-wider mb-2 font-bold opacity-70 pl-1">Lagerung Material</label>
                      <div className={`flex gap-2 p-1.5 rounded-xl ${isDark ? 'bg-black/30 border border-white/5' : 'bg-slate-300/40 border border-slate-300/50'}`}>
                        <button onClick={() => setOrderDetails({...orderDetails, storageLocation: 'messtex'})} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all duration-300 ${orderDetails.storageLocation === 'messtex' ? 'bg-purple-600/90 text-white shadow-md scale-[1.02] border border-purple-500/50' : 'opacity-60 hover:opacity-100 hover:bg-white/10'}`}>Messtex</button>
                        <button onClick={() => setOrderDetails({...orderDetails, storageLocation: 'auftraggeber'})} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all duration-300 ${orderDetails.storageLocation === 'auftraggeber' ? 'bg-indigo-500/90 text-white shadow-md scale-[1.02] border border-indigo-400/50' : 'opacity-60 hover:opacity-100 hover:bg-white/10'}`}>Kunde</button>
                      </div>
                    </div>
                    <div>
                       <label className="block text-xs uppercase tracking-wider mb-2 font-bold opacity-70 pl-1">Altzähler</label>
                       <div className={`flex gap-2 p-1.5 rounded-xl ${isDark ? 'bg-black/30 border border-white/5' : 'bg-slate-300/40 border border-slate-300/50'}`}>
                        <button onClick={() => setOrderDetails({...orderDetails, oldMeterDisposal: 'entsorgen'})} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all duration-300 ${orderDetails.oldMeterDisposal === 'entsorgen' ? 'bg-red-500/90 text-white shadow-md scale-[1.02] border border-red-400/50' : 'opacity-60 hover:opacity-100 hover:bg-white/10'}`}>Entsorgen</button>
                        <button onClick={() => setOrderDetails({...orderDetails, oldMeterDisposal: 'abgeben'})} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all duration-300 ${orderDetails.oldMeterDisposal === 'abgeben' ? 'bg-blue-500/90 text-white shadow-md scale-[1.02] border border-blue-400/50' : 'opacity-60 hover:opacity-100 hover:bg-white/10'}`}>Abgeben</button>
                      </div>
                    </div>
                  </div>

                  {/* ADRESSZEILE FÜR LAGERORT */}
                  <div className="relative">
                    <Package size={16} className="absolute left-4 top-1/2 transform -translate-y-1/2 opacity-50" />
                    <input type="text" placeholder="Lagerort des Materials (Straße, PLZ, Ort)" value={orderDetails.storageAddress || ''} onChange={e => setOrderDetails({...orderDetails, storageAddress: e.target.value})} className={`w-full ${theme.input} rounded-xl pl-10 pr-4 py-3 outline-none`} />
                  </div>

                  {/* ZEILE 4: Zählerinformationen */}
                  <div className={`p-5 rounded-2xl border ${isDark ? 'bg-black/20 border-white/5' : 'bg-white/30 border-white/40'}`}>
                    <h3 className="text-sm font-bold mb-4 opacity-80 pl-1">Zählerinformationen</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <input type="text" placeholder="Neu: Hersteller" value={meterInfo.newManufacturer} onChange={e => setMeterInfo({...meterInfo, newManufacturer: e.target.value})} className={`w-full ${theme.input} rounded-xl p-3 text-sm outline-none`} />
                      <input type="text" placeholder="Neu: Typ" value={meterInfo.newType} onChange={e => setMeterInfo({...meterInfo, newType: e.target.value})} className={`w-full ${theme.input} rounded-xl p-3 text-sm outline-none`} />
                      <input type="text" placeholder="Alt verbaut" value={meterInfo.currentInstalled} onChange={e => setMeterInfo({...meterInfo, currentInstalled: e.target.value})} className={`w-full ${theme.input} rounded-xl p-3 text-sm outline-none`} />
                    </div>
                  </div>
                </div>
              </div>

              {/* LEISTUNGSVERZEICHNIS (LV) */}
              <div className={`${theme.card} rounded-3xl p-6 md:p-8 ${theme.hover3D}`}>
                <h2 className={`${theme.title} text-xl font-bold mb-6 flex items-center justify-between border-b ${isDark ? 'border-white/10' : 'border-slate-300/50'} pb-4`}>
                  <div className="flex items-center gap-2"><Receipt className="text-yellow-500" /> Leistungsverzeichnis</div>
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
                      <input type="text" value={item.pos} readOnly className={`w-16 ${theme.input} rounded-xl p-2.5 text-sm outline-none text-center font-bold opacity-70 cursor-default`} />
                      <input type="text" placeholder="Leistungsbeschreibung..." value={item.desc} onChange={e => handleLvChange(item.id, 'desc', e.target.value)} className={`flex-1 ${theme.input} rounded-xl p-2.5 text-sm outline-none`} />
                      <input type="text" placeholder="z.B. 100,00" value={item.price} onChange={e => handleLvChange(item.id, 'price', e.target.value)} onBlur={(e) => formatPrice(item.id, item.price, e)} onKeyDown={(e) => formatPrice(item.id, item.price, e)} className={`w-24 ${theme.input} rounded-xl p-2.5 text-sm outline-none text-right`} />
                      <button onClick={() => removeLvItem(item.id)} className="w-8 h-8 flex items-center justify-center text-red-500 hover:bg-red-500/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={16}/></button>
                    </div>
                  ))}
                  <button onClick={addLvItem} className="text-yellow-500 font-bold flex items-center gap-1 hover:text-yellow-600 transition-colors mt-4 text-sm pl-1"><Plus size={16} /> Weitere Position hinzufügen</button>
                </div>
              </div>

            </div>

            {/* --- RECHTE SPALTE --- */}
            <div className="space-y-8">

              {/* KICK-OFF TERMIN */}
              <div className={`${theme.card} rounded-3xl p-6 md:p-8 ${theme.hover3D} relative`}>
                <h2 className={`${theme.title} text-xl font-bold mb-6 flex items-center justify-between border-b ${isDark ? 'border-white/10' : 'border-slate-300/50'} pb-4`}>
                  <span className="flex items-center gap-2"><CalendarIcon className="text-purple-500" /> Start</span>
                  {kickoffDate === '' && <span className="text-red-500 text-xs flex items-center gap-1"><AlertCircle size={14}/> Pflicht</span>}
                </h2>
                <div className="relative group hover:scale-[1.02] transition-transform duration-300 cursor-pointer">
                  {kickoffDate && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-500 to-purple-400 text-white text-sm font-bold px-5 py-1.5 rounded-full z-20 shadow-[0_5px_15px_rgba(168,85,247,0.3)] border border-purple-300/50 backdrop-blur-md">
                      Kalenderwoche {kw}
                    </div>
                  )}
                  
                  <div className="flex gap-4 mt-2 pointer-events-none">
                    <div className={`${theme.flipCard} rounded-2xl p-8 flex flex-col items-center justify-center flex-1 relative overflow-hidden`}>
                      <div className="absolute top-1/2 left-0 w-full h-[1px] bg-black/20 z-10"></div>
                      <span className={`text-6xl md:text-7xl font-black tracking-tight z-0 ${theme.title}`}>{day}</span>
                    </div>
                    <div className={`${theme.flipCard} rounded-2xl p-8 flex flex-col items-center justify-center flex-1 relative overflow-hidden`}>
                      <div className="absolute top-1/2 left-0 w-full h-[1px] bg-black/20 z-10 shadow-sm"></div>
                      <span className={`text-5xl md:text-6xl font-black tracking-tight z-0 ${theme.title}`}>{month}</span>
                    </div>
                  </div>

                  <input 
                    type="date" 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-50 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                    onChange={(e) => setKickoffDate(e.target.value)}
                  />
                  <p className="text-center mt-6 text-sm font-bold opacity-50 group-hover:text-purple-500 transition-colors pointer-events-none">Klicken zum Datum wählen</p>
                </div>
              </div>

              {/* STATISCHE CHECKLISTE MIT AUSWAHL-CHIPS & MINI-BADGES */}
              <div className={`${theme.card} rounded-3xl p-6 md:p-8 ${theme.hover3D}`}>
                 <h2 className={`${theme.title} text-xl font-bold mb-6 flex items-center gap-2 border-b ${isDark ? 'border-white/10' : 'border-slate-300/50'} pb-4`}>
                  <FileText className="text-green-500" /> Checkliste
                </h2>
                <div className="space-y-4">
                  
                  {/* 1. Parkausweise */}
                  <div className={`border rounded-2xl overflow-hidden transition-all duration-300 backdrop-blur-md ${tasks.parkausweise ? 'border-green-500/50 bg-green-500/10' : isDark ? 'border-white/10 bg-white/5' : 'border-white/40 bg-white/30'}`}>
                    <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/10" onClick={() => setExpandedCard(expandedCard === 'park' ? null : 'park')}>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full">
                        
                        <div className="flex items-center gap-3 cursor-pointer z-10 p-1 -ml-1 rounded-lg hover:bg-black/10" onClick={(e) => handleToggleTask('parkausweise', e)} title="Klicken, wenn physische Ausweise eingetroffen sind">
                           {tasks.parkausweise ? <CheckCircle2 className="text-green-500 shadow-sm rounded-full shrink-0" /> : <Circle className="text-slate-500 shrink-0 hover:text-green-500 transition-colors" />}
                           <span className="font-bold">Parkausweise erhalten</span>
                        </div>

                        {/* MINI-BADGES IM HEADER (Bis zu 3 Stück + Rest) */}
                        {vehicles.length > 0 && (
                          <div className="flex flex-wrap gap-1 sm:ml-auto pr-2">
                            {vehicles.slice(0, 3).map(v => (
                              <span key={v} className={`flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${isDark ? 'bg-black/30 border-white/10 text-slate-300' : 'bg-white/60 border-slate-300 text-slate-700'}`}>
                                <Car size={10} /> {v}
                              </span>
                            ))}
                            {vehicles.length > 3 && (
                              <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${isDark ? 'bg-black/30 border-white/10 text-slate-300' : 'bg-white/60 border-slate-300 text-slate-700'}`}>+{vehicles.length - 3}</span>
                            )}
                          </div>
                        )}
                        
                      </div>
                      {expandedCard === 'park' ? <ChevronUp size={20} className="opacity-50 shrink-0 ml-2" /> : <ChevronDown size={20} className="opacity-50 shrink-0 ml-2" />}
                    </div>
                    
                    {expandedCard === 'park' && (
                      <div className={`p-4 border-t ${isDark ? 'border-white/10 bg-black/20' : 'border-slate-300/50 bg-slate-200/50'}`}>
                        <div className="mb-4">
                          <p className="text-[10px] font-bold uppercase tracking-wider opacity-60 mb-3 pl-1">Schnellauswahl (Klicken für PDF)</p>
                          <div className="flex flex-wrap gap-2">
                            {Array.from(new Set([...defaultVehicles, ...vehicles])).map(v => {
                               const isSelected = vehicles.includes(v);
                               return (
                                 <button 
                                   key={v} 
                                   onClick={() => toggleVehicle(v)}
                                   className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all duration-300 border ${isSelected ? (isDark ? 'bg-orange-500/90 text-white border-orange-400/50 shadow-[0_0_10px_rgba(249,115,22,0.3)]' : 'bg-orange-500 text-white border-orange-600 shadow-md') : (isDark ? 'bg-black/30 border-white/10 text-slate-300 hover:bg-white/10' : 'bg-white/60 border-slate-300 text-slate-700 hover:bg-white')}`}
                                 >
                                   <Car size={12} className={isSelected ? "text-white" : "opacity-50"} /> {v}
                                 </button>
                               )
                            })}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Car size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 opacity-50" />
                            <input type="text" placeholder="Neues Kennzeichen (z.B. M-AB 123)" value={newVehicle} onChange={e => setNewVehicle(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCustomVehicle()} className={`w-full ${theme.input} rounded-xl pl-9 pr-3 py-2 text-sm outline-none`} />
                          </div>
                          <button onClick={addCustomVehicle} className={`px-4 rounded-xl text-sm font-bold transition-colors border shadow-sm ${isDark ? 'bg-white/10 hover:bg-white/20 text-white border-white/20' : 'bg-white/60 hover:bg-white border-slate-300 text-slate-800'}`}>Hinzufügen</button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 2. Mitarbeiterausweise */}
                  <div className={`border rounded-2xl overflow-hidden transition-all duration-300 backdrop-blur-md ${tasks.mitarbeiter ? 'border-green-500/50 bg-green-500/10' : isDark ? 'border-white/10 bg-white/5' : 'border-white/40 bg-white/30'}`}>
                    <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/10" onClick={() => setExpandedCard(expandedCard === 'mitarbeiter' ? null : 'mitarbeiter')}>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full">
                        
                        <div className="flex items-center gap-3 cursor-pointer z-10 p-1 -ml-1 rounded-lg hover:bg-black/10" onClick={(e) => handleToggleTask('mitarbeiter', e)} title="Klicken, wenn physische Ausweise eingetroffen sind">
                           {tasks.mitarbeiter ? <CheckCircle2 className="text-green-500 shadow-sm rounded-full shrink-0" /> : <Circle className="text-slate-500 shrink-0 hover:text-green-500 transition-colors" />}
                           <span className="font-bold">Mitarbeiterausweise erhalten</span>
                        </div>

                        {/* MINI-BADGES IM HEADER (Bis zu 3 Stück + Rest) */}
                        {employees.length > 0 && (
                          <div className="flex flex-wrap gap-1 sm:ml-auto pr-2">
                            {employees.slice(0, 3).map(emp => (
                              <span key={emp} className={`flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${isDark ? 'bg-black/30 border-white/10 text-slate-300' : 'bg-white/60 border-slate-300 text-slate-700'}`}>
                                <IdCard size={10} /> {emp}
                              </span>
                            ))}
                            {employees.length > 3 && (
                              <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${isDark ? 'bg-black/30 border-white/10 text-slate-300' : 'bg-white/60 border-slate-300 text-slate-700'}`}>+{employees.length - 3}</span>
                            )}
                          </div>
                        )}

                      </div>
                      {expandedCard === 'mitarbeiter' ? <ChevronUp size={20} className="opacity-50 shrink-0 ml-2" /> : <ChevronDown size={20} className="opacity-50 shrink-0 ml-2" />}
                    </div>
                    
                    {expandedCard === 'mitarbeiter' && (
                      <div className={`p-4 border-t ${isDark ? 'border-white/10 bg-black/20' : 'border-slate-300/50 bg-slate-200/50'}`}>
                        
                        <div className="mb-4">
                          <p className="text-[10px] font-bold uppercase tracking-wider opacity-60 mb-3 pl-1">Schnellauswahl (Klicken für PDF)</p>
                          <div className="flex flex-wrap gap-2">
                            {Array.from(new Set([...defaultEmployees, ...employees])).map(emp => {
                               const isSelected = employees.includes(emp);
                               return (
                                 <button 
                                   key={emp} 
                                   onClick={() => toggleEmployee(emp)}
                                   className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 border ${isSelected ? (isDark ? 'bg-orange-500/90 text-white border-orange-400/50 shadow-[0_0_10px_rgba(249,115,22,0.3)]' : 'bg-orange-500 text-white border-orange-600 shadow-md') : (isDark ? 'bg-black/30 border-white/10 text-slate-300 hover:bg-white/10' : 'bg-white/60 border-slate-300 text-slate-700 hover:bg-white')}`}
                                 >
                                   <IdCard size={12} className={isSelected ? "text-white" : "opacity-50"} /> {emp}
                                 </button>
                               )
                            })}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <IdCard size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 opacity-50" />
                            <input type="text" placeholder="Neuer Name (z.B. Max Mustermann)" value={newEmployee} onChange={e => setNewEmployee(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCustomEmployee()} className={`w-full ${theme.input} rounded-xl pl-9 pr-3 py-2 text-sm outline-none`} />
                          </div>
                          <button onClick={addCustomEmployee} className={`px-4 rounded-xl text-sm font-bold transition-colors border shadow-sm ${isDark ? 'bg-white/10 hover:bg-white/20 text-white border-white/20' : 'bg-white/60 hover:bg-white border-slate-300 text-slate-800'}`}>Hinzufügen</button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 3. Datensatz */}
                  <div className={`p-4 rounded-2xl border transition-all duration-300 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-4 backdrop-blur-md ${tasks.datensatz ? 'border-green-500/50 bg-green-500/10' : isDark ? 'border-white/10 bg-white/5' : 'border-white/40 bg-white/30'}`}>
                    <div className="flex items-center gap-3">
                      {tasks.datensatz ? <CheckCircle2 className="text-green-500 shadow-sm rounded-full" /> : <AlertCircle className="text-red-500" />}
                      <span className="font-bold">Datensatz erhalten</span>
                    </div>
                    {files?.datensatz ? (
                      <div className={`flex flex-wrap items-center gap-2 px-3 py-1.5 rounded-xl ${theme.input}`}>
                        <span className="text-xs text-green-500 font-bold truncate max-w-[100px]">{files.datensatz?.name || 'Datei'}</span>
                        <div className="flex gap-1 ml-auto">
                           <a href={files.datensatz?.url || '#'} download={files.datensatz?.name || 'download'} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-blue-500/80 hover:bg-blue-500 text-white rounded-lg transition-colors border border-blue-400/50" title="Herunterladen"><Download size={14}/></a>
                           <button onClick={() => removeFile('datensatz')} className="p-1.5 bg-red-500/80 hover:bg-red-500 text-white rounded-lg transition-colors border border-red-400/50" title="Löschen"><Trash2 size={14}/></button>
                        </div>
                      </div>
                    ) : (
                      <label className={`flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer text-sm font-bold transition-all hover:scale-105 shadow-sm border ${isDark ? 'bg-white/10 hover:bg-white/20 text-white border-white/20' : 'bg-white/60 hover:bg-white border-slate-300 text-slate-800'}`}>
                        <UploadCloud size={16} /> Upload <input type="file" className="hidden" onChange={(e) => handleFileUpload('datensatz', e)} />
                      </label>
                    )}
                  </div>

                  {/* 4. Ankündigung */}
                  <div className={`p-4 rounded-2xl border transition-all duration-300 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-4 backdrop-blur-md ${tasks.ankuendigung ? 'border-green-500/50 bg-green-500/10' : isDark ? 'border-white/10 bg-white/5' : 'border-white/40 bg-white/30'}`}>
                    <div className="flex items-center gap-3">
                      {tasks.ankuendigung ? <CheckCircle2 className="text-green-500 shadow-sm rounded-full" /> : <AlertCircle className="text-red-500" />}
                      <span className="font-bold">Ankündigung freigegeben</span>
                    </div>
                    {files?.ankuendigung ? (
                      <div className={`flex flex-wrap items-center gap-2 px-3 py-1.5 rounded-xl ${theme.input}`}>
                        <span className="text-xs text-green-500 font-bold truncate max-w-[100px]">{files.ankuendigung?.name || 'Datei'}</span>
                        <div className="flex gap-1 ml-auto">
                           <button onClick={() => setPreviewFile(files.ankuendigung)} className="p-1.5 bg-blue-500/80 hover:bg-blue-500 text-white rounded-lg transition-colors border border-blue-400/50" title="Vorschau ansehen"><Eye size={14}/></button>
                           <a href={files.ankuendigung?.url || '#'} download={files.ankuendigung?.name || 'download'} target="_blank" rel="noopener noreferrer" className={`p-1.5 rounded-lg transition-colors border shadow-sm ${isDark ? 'bg-white/10 hover:bg-white/20 text-white border-white/20' : 'bg-white/60 hover:bg-white text-slate-800 border-slate-300'}`} title="Herunterladen"><Download size={14}/></a>
                           <button onClick={() => removeFile('ankuendigung')} className="p-1.5 bg-red-500/80 hover:bg-red-500 text-white rounded-lg transition-colors border border-red-400/50" title="Löschen"><Trash2 size={14}/></button>
                        </div>
                      </div>
                    ) : (
                      <label className={`flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer text-sm font-bold transition-all hover:scale-105 shadow-sm border ${isDark ? 'bg-white/10 hover:bg-white/20 text-white border-white/20' : 'bg-white/60 hover:bg-white border-slate-300 text-slate-800'}`}>
                        <UploadCloud size={16} /> Upload <input type="file" className="hidden" accept=".pdf" onChange={(e) => handleFileUpload('ankuendigung', e)} />
                      </label>
                    )}
                  </div>

                  {/* 5. Import */}
                  <div onClick={() => handleToggleTask('datenimport', { stopPropagation: () => {} })} className={`p-4 rounded-2xl border transition-all duration-300 shadow-sm flex items-center justify-between cursor-pointer hover:scale-[1.02] backdrop-blur-md ${tasks.datenimport ? 'border-green-500/50 bg-green-500/10' : isDark ? 'border-white/10 bg-white/5 hover:bg-white/10' : 'border-white/40 bg-white/30 hover:bg-white/50'}`}>
                    <div className="flex items-center gap-3">
                      {tasks.datenimport ? <CheckCircle2 className="text-green-500 shadow-sm rounded-full" /> : <AlertCircle className="text-red-500" />}
                      <span className="font-bold">Datensatz importiert</span>
                    </div>
                    {!tasks.datenimport && <span className="text-xs opacity-50 font-bold">Klicken zum Abhaken</span>}
                  </div>
                </div>
              </div>

              {/* NOTIZEN & ZUSATZDOKUMENTE */}
              <div className={`${theme.card} rounded-3xl p-6 md:p-8 ${theme.hover3D}`}>
                <h2 className={`${theme.title} text-xl font-bold mb-6 flex items-center gap-2 border-b ${isDark ? 'border-white/10' : 'border-slate-300/50'} pb-4`}>
                  <MessageSquare className="text-pink-500" /> Notizen & Dokumente
                </h2>
                <textarea placeholder="Projekt-Infos, Absprachen, Codes für den Schlüsseltresor..." value={notes} onChange={(e) => setNotes(e.target.value)} className={`w-full ${theme.input} rounded-2xl p-5 text-sm outline-none resize-none min-h-[120px] mb-6 leading-relaxed`}></textarea>
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-bold uppercase tracking-wider opacity-70">Zusätzliche Dateien</span>
                    <label className={`flex items-center gap-2 px-3 py-1.5 rounded-xl cursor-pointer text-xs font-bold transition-all hover:scale-105 shadow-sm border ${isDark ? 'bg-white/10 hover:bg-white/20 text-white border-white/20' : 'bg-white/60 hover:bg-white border-slate-300 text-slate-800'}`}>
                      <Paperclip size={14} /> Hinzufügen <input type="file" multiple className="hidden" onChange={handleExtraFileUpload} />
                    </label>
                  </div>
                  <div className="space-y-2">
                    {extraFiles?.length === 0 && <p className="text-xs opacity-50 italic">Noch keine Dokumente hochgeladen.</p>}
                    {extraFiles?.map(file => (
                       <div key={file.id} className={`flex items-center justify-between p-3 rounded-xl border backdrop-blur-md ${isDark ? 'bg-black/20 border-white/5' : 'bg-white/50 border-slate-200'}`}>
                          <span className="text-xs font-bold truncate max-w-[200px]">{file?.name || 'Dokument'}</span>
                          <div className="flex gap-1.5">
                             {(file?.type?.includes('pdf') || file?.type?.includes('image')) && (
                               <button onClick={() => setPreviewFile(file)} className="p-1.5 bg-blue-500/80 hover:bg-blue-500 text-white rounded-lg transition-colors border border-blue-400/50" title="Vorschau ansehen"><Eye size={14}/></button>
                             )}
                             <a href={file?.url || '#'} download={file?.name || 'download'} target="_blank" rel="noopener noreferrer" className={`p-1.5 rounded-lg transition-colors border shadow-sm ${isDark ? 'bg-white/10 hover:bg-white/20 text-white border-white/20' : 'bg-white/60 hover:bg-white text-slate-800 border-slate-300'}`} title="Herunterladen"><Download size={14}/></a>
                             <button onClick={() => removeExtraFile(file.id)} className="p-1.5 bg-red-500/80 hover:bg-red-500 text-white rounded-lg transition-colors border border-red-400/50" title="Löschen"><Trash2 size={14}/></button>
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