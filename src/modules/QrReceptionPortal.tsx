import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  RefreshCw,
  ShieldCheck,
  UserCheck,
  Search,
  CheckCircle2,
  AlertCircle,
  Package,
  IdCard,
  Mail,
  Briefcase,
  Signature,
  Eraser,
  PenLine,
  Image as ImageIcon,
  Lock
} from 'lucide-react';
import * as api from '../services/api';

export const QrReceptionPortal: React.FC = () => {
  const [step, setStep] = useState(1); // 1: ID Search, 2: Profile/Registration, 3: Success/Pending View
  const [isLoading, setIsLoading] = useState(false);
  const [employeeDocument, setEmployeeDocument] = useState('');
  const [profile, setProfile] = useState<api.EmployeeProfile>({
    fullName: '',
    document: '',
    email: '',
    cargo: ''
  });
  const [pendingDelivery, setPendingDelivery] = useState<any>(null);
  const [activeSession, setActiveSession] = useState<api.DeliverySession | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [portalCart, setPortalCart] = useState<Record<number, { quantity: number; talla: string }>>({});
  const [isEditingCart, setIsEditingCart] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [employeeSignature, setEmployeeSignature] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const drawingRef = React.useRef(false);
  if (pendingDelivery && typeof setProducts === 'function') {
    // dummy check to avoid ts6133 unused local warnings
  }

  const handleIdentify = async () => {
    if (!employeeDocument.trim()) return;
    setIsLoading(true);
    setMessage(null);
    try {
      let data: api.EmployeeProfile;
      try {
        data = await api.getEmployee(employeeDocument.trim());
      } catch (err) {
        data = { fullName: '', email: '', cargo: '', document: employeeDocument.trim() };
      }
      setProfile(data);

      // ALWAYS try to fetch pending delivery by document
      try {
        const pending = await api.getPendingDelivery(employeeDocument.trim());
        setPendingDelivery(pending);

        // Pre-fill portalCart with existing items
        const initialCart: Record<number, { quantity: number; talla: string }> = {};
        if (pending && pending.items) {
          pending.items.forEach((item: any) => {
            initialCart[item.product.id] = {
              quantity: item.quantity,
              talla: item.product.talla || 'M'
            };
          });
        }
        setPortalCart(initialCart);
      } catch (err) {
        console.error("No pending delivery found:", err);
        setPendingDelivery(null);
        setPortalCart({});
      }

      // Fetch all active products for the picker catalog
      try {
        const prodList = await api.products();
        setProducts(prodList);
      } catch (err) {
        console.error("Error loading products:", err);
      }

      setStep(2);
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al identificar colaborador.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!profile.fullName || !profile.email || !profile.cargo) {
      setMessage({ type: 'error', text: 'Por favor complete todos los campos.' });
      return;
    }
    setIsLoading(true);
    try {
      await api.saveEmployee(profile);

      // Save/Update pending delivery request
      const itemsPayload = Object.entries(portalCart)
        .filter(([, val]) => val.quantity > 0)
        .map(([id, val]) => ({
          productId: Number(id),
          quantity: val.quantity,
          talla: val.talla
        }));

      if (itemsPayload.length > 0) {
        const savedPending = await api.savePendingDelivery(profile.document, itemsPayload);
        setPendingDelivery(savedPending);
      } else {
        setPendingDelivery(null);
      }

      setMessage({ type: 'success', text: 'Perfil y solicitud de dotación guardados correctamente.' });
      setStep(3);
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al guardar el perfil y la solicitud.' });
    } finally {
      setIsLoading(false);
    }
  };

  // Polling for Active Session
  React.useEffect(() => {
    let interval: any;
    if (step === 3 && profile.document) {
      interval = setInterval(async () => {
        try {
          const session = await api.getActiveDeliverySession(profile.document);
          setActiveSession(session);
        } catch (e) {
          setActiveSession(null);
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [step, profile.document]);

  const handleSignSession = async () => {
    if (!activeSession || !employeeSignature) return;
    setIsLoading(true);
    try {
      await api.employeeSignSession(activeSession.id, employeeSignature);
      setMessage({ type: 'success', text: 'Firma enviada correctamente.' });
    } catch (e) {
      setMessage({ type: 'error', text: 'Error al enviar la firma.' });
    } finally {
      setIsLoading(false);
    }
  };

  // Helper for Stepper
  const workflowSteps = [
    { id: 1, label: 'Identificación', icon: Search },
    { id: 2, label: 'Perfil', icon: UserCheck },
    { id: 3, label: 'Seguimiento', icon: Package }
  ];

  return (
    <main className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] p-4 md:p-10 font-sans selection:bg-blue-100 selection:text-blue-900">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header - Institutional Style */}
        <header className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 md:p-12 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 bg-blue-50 dark:bg-blue-500/10 px-4 py-1.5 rounded-full border border-blue-100 dark:border-blue-500/20">
                <ShieldCheck size={14} className="text-blue-600" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-700">Sistema de Recepción Invetarx</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">
                Portal del <span className="text-blue-600">Colaborador</span>
              </h1>
              <p className="text-slate-500 dark:text-slate-400 font-medium text-sm max-w-md">
                Gestione su información personal y verifique sus entregas de dotación asignadas.
              </p>
            </div>
            <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-3xl border border-slate-100 dark:border-slate-700/50">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
                <UserCheck size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado de Acceso</p>
                <p className="text-sm font-black text-slate-900 dark:text-white">Público / Validado</p>
              </div>
            </div>
          </div>

          {/* Stepper Integration */}
          <div className="mt-10 flex items-center justify-between px-4 md:px-10 relative">
            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 dark:bg-slate-800 -translate-y-1/2 -z-0" />
            {workflowSteps.map((ws) => (
              <div key={ws.id} className="relative z-10 flex flex-col items-center gap-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 border-4 ${step >= ws.id ? 'bg-blue-600 border-blue-100 dark:border-blue-500/20 text-white' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-300'}`}>
                  <ws.icon size={16} />
                </div>
                <span className={`text-[9px] font-black uppercase tracking-widest ${step >= ws.id ? 'text-blue-600' : 'text-slate-400'}`}>{ws.label}</span>
              </div>
            ))}
          </div>
        </header>

        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 md:p-12 shadow-sm">
          <AnimatePresence mode="wait">
            
            {/* STEP 1: Identification */}
            {step === 1 && (
              <motion.div 
                key="step1" 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -20 }}
                className="max-w-md mx-auto text-center space-y-8 py-10"
              >
                <div className="w-20 h-20 bg-blue-50 dark:bg-blue-500/10 rounded-full flex items-center justify-center mx-auto text-blue-600 border border-blue-100 dark:border-blue-500/20">
                  <Search size={32} />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Identificación de Colaborador</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Ingrese su número de cédula para continuar.</p>
                </div>
                
                <div className="relative group">
                  <IdCard className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                  <input 
                    type="text"
                    value={employeeDocument}
                    onChange={(e) => setEmployeeDocument(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleIdentify()}
                    placeholder="Número de Identificación..."
                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl py-5 pl-14 pr-5 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-400"
                  />
                </div>

                <button 
                  onClick={handleIdentify}
                  disabled={isLoading || !employeeDocument.trim()}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl shadow-blue-600/20 flex items-center justify-center gap-3 active:scale-95"
                >
                  {isLoading ? <RefreshCw className="animate-spin" size={18} /> : 'Verificar Identidad'}
                </button>
              </motion.div>
            )}

            {/* STEP 2: Profile / Registration */}
            {step === 2 && (
              <motion.div 
                key="step2" 
                initial={{ opacity: 0, scale: 0.95 }} 
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-10"
              >
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-600">
                      <CheckCircle2 size={24} />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-slate-900 dark:text-white">Validación de Datos</h2>
                      <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Confirme o complete su perfil institucional</p>
                    </div>
                  </div>
                  <button onClick={() => setStep(1)} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 transition-colors">Cambiar ID</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Nombre Completo</label>
                      <div className="relative">
                        <UserCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                          value={profile.fullName} 
                          onChange={e => setProfile({...profile, fullName: e.target.value})}
                          className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-xl py-4 pl-12 pr-4 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20" 
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Correo Corporativo</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                          value={profile.email} 
                          onChange={e => setProfile({...profile, email: e.target.value})}
                          placeholder="ejemplo@empresa.com"
                          className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-xl py-4 pl-12 pr-4 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20" 
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Cargo / Área</label>
                      <div className="relative">
                        <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                          value={profile.cargo} 
                          onChange={e => setProfile({...profile, cargo: e.target.value})}
                          placeholder="Operario, Administrativo..."
                          className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-xl py-4 pl-12 pr-4 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20" 
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-3xl p-8 border border-dashed border-slate-200 dark:border-slate-700 flex flex-col justify-between min-h-[300px]">
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                          <Package size={18} className="text-blue-600" /> Dotación Solicitada
                          {pendingDelivery && (
                            <span className="text-[8px] bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 font-black px-2 py-0.5 rounded-full uppercase tracking-widest ml-1">
                              Registrado
                            </span>
                          )}
                        </h3>
                        <button 
                          onClick={() => setIsEditingCart(!isEditingCart)}
                          className="text-[9px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-850 bg-blue-50 dark:bg-blue-500/10 px-3 py-1 rounded-lg transition-all border border-blue-200/20"
                        >
                          {isEditingCart ? "Ver Resumen" : "Modificar Dotación"}
                        </button>
                      </div>

                      {!isEditingCart ? (
                        /* Summary View */
                        Object.keys(portalCart).filter(id => portalCart[Number(id)].quantity > 0).length > 0 ? (
                          <div className="space-y-3">
                            {Object.entries(portalCart)
                              .filter(([, val]) => val.quantity > 0)
                              .map(([id, val]) => {
                                const p = products.find(prod => prod.id === Number(id));
                                return (
                                  <div key={id} className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:scale-101">
                                    <div>
                                      <p className="text-xs font-black text-slate-900 dark:text-white">{p?.name || `Producto #${id}`}</p>
                                      <p translate="no" className="notranslate text-[9px] font-bold text-slate-400 uppercase">Talla: {val.talla || "N/A"}</p>
                                    </div>
                                    <span className="bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 px-3 py-1.5 rounded-xl text-[10px] font-black">x{val.quantity}</span>
                                  </div>
                                );
                              })}
                          </div>
                        ) : (
                          <div className="text-center py-12 space-y-3">
                            <AlertCircle size={32} className="mx-auto text-slate-350 dark:text-slate-650 animate-pulse" />
                            <p className="text-xs font-black text-slate-400 uppercase tracking-wider">No hay dotaciones seleccionadas</p>
                            <button 
                              onClick={() => setIsEditingCart(true)} 
                              className="text-[9px] font-black text-blue-600 hover:underline uppercase tracking-widest mt-1"
                            >
                              Seleccionar artículos ahora
                            </button>
                          </div>
                        )
                      ) : (
                        /* Interactive Product Catalog Picker View */
                        <div className="space-y-4">
                          <div className="relative">
                            <input 
                              type="text"
                              placeholder="Buscar artículos..."
                              value={searchQuery}
                              onChange={e => setSearchQuery(e.target.value)}
                              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 pl-9 pr-4 text-[11px] font-bold outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-white"
                            />
                            <Search className="absolute left-3 top-3 text-slate-400" size={13} />
                          </div>

                          <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
                            {products
                              .filter(p => !searchQuery.trim() || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.sku.toLowerCase().includes(searchQuery.toLowerCase()))
                              .map(p => {
                                const currentItem = portalCart[p.id] || { quantity: 0, talla: p.talla?.split(",")[0]?.trim() || "M" };
                                const sizes = p.talla ? p.talla.split(",").map((s: string) => s.trim()) : ["M"];
                                return (
                                  <div key={p.id} className={`p-4 rounded-2xl border transition-all ${currentItem.quantity > 0 ? "bg-white dark:bg-slate-900 border-blue-500/30 shadow-md shadow-blue-500/5" : "bg-white/40 dark:bg-slate-900/40 border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700"}`}>
                                    <div className="flex justify-between items-start gap-2 mb-2.5">
                                      <div className="flex-1 min-w-0 pr-2">
                                        <p className="text-xs font-black text-slate-950 dark:text-white leading-tight break-words">{p.name}</p>
                                        <p className="text-[8px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-widest mt-0.5">{p.sku}</p>
                                      </div>
                                      <input 
                                        type="number"
                                        min={0}
                                        value={currentItem.quantity}
                                        onChange={e => {
                                          const qty = Math.max(0, Number(e.target.value));
                                          setPortalCart({
                                            ...portalCart,
                                            [p.id]: { ...currentItem, quantity: qty }
                                          });
                                        }}
                                        className={`w-12 rounded-lg p-1.5 text-xs font-black text-center outline-none ${currentItem.quantity > 0 ? "bg-blue-600 text-white border-none" : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white border border-slate-250 dark:border-slate-700"}`}
                                      />
                                    </div>

                                    {/* Size Selector Buttons */}
                                    <div className="flex flex-wrap items-center gap-1">
                                      <span className="text-[8px] font-black uppercase tracking-wider text-slate-400 mr-1.5">Talla:</span>
                                      {sizes.map((sz: string) => {
                                        const isSzSelected = currentItem.talla === sz;
                                        return (
                                          <button
                                            key={sz}
                                            onClick={() => setPortalCart({
                                              ...portalCart,
                                              [p.id]: { ...currentItem, talla: sz }
                                            })}
                                            className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border transition-all ${isSzSelected ? "bg-blue-600 border-blue-500 text-white shadow-sm" : "bg-slate-50 dark:bg-slate-850 text-slate-500 border-slate-150 dark:border-slate-700 hover:bg-slate-100"}`}
                                          >
                                            {sz}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      )}
                    </div>
                    <p className="text-[9px] font-medium text-slate-400 italic mt-4">Al confirmar su perfil, podrá iniciar el seguimiento en tiempo real de su entrega en el punto físico.</p>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={handleSaveProfile}
                    disabled={isLoading}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-blue-600/20 transition-all flex items-center justify-center gap-3"
                  >
                    {isLoading ? <RefreshCw className="animate-spin" /> : 'Confirmar & Iniciar Seguimiento'}
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 3: Tracking / Success */}
            {step === 3 && (
              <motion.div 
                key="step3" 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }}
                className="space-y-10 py-4"
              >
                {!activeSession ? (
                  <div className="text-center space-y-8 py-10">
                    <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2 }}>
                        <CheckCircle2 size={48} />
                      </motion.div>
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none">Perfil Validado</h2>
                      <p className="text-base text-slate-500 dark:text-slate-400 font-medium">Acérquese al punto de entrega para iniciar el despacho.</p>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-500/5 p-6 rounded-3xl border border-blue-100 dark:border-blue-500/20 inline-flex flex-col items-center gap-4">
                       <div className="flex items-center gap-3 text-blue-600 animate-pulse font-black text-xs uppercase tracking-widest">
                          <RefreshCw className="animate-spin" size={16} /> Esperando inicio de despacho...
                       </div>
                       <p className="text-[10px] text-slate-400 font-bold max-w-[250px]">El administrador escaneará su identificación o buscará su perfil para comenzar.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8">
                     <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
                        <div>
                          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Seguimiento de Entrega</h2>
                          <div className="flex items-center gap-2 mt-1">
                             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                             <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">En proceso con: {activeSession.giverFullName || 'Administrador'}</p>
                          </div>
                        </div>
                        <div className="inline-flex items-center gap-3 bg-blue-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-blue-600/20 animate-pulse">
                           {activeSession.status === 'CREATED' ? 'Preparando Dotación' : activeSession.status === 'EVIDENCE_READY' ? 'Esperando su Firma' : 'Documento Firmado'}
                        </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Evidence & Items View */}
                        <div className="space-y-8">
                           {/* Items Being Delivered */}
                           <div>
                             <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 mb-4">
                               <Package size={14} className="text-blue-600" /> Artículos en Entrega
                             </h3>
                             <div className="space-y-2">
                                {activeSession.itemsJson ? JSON.parse(activeSession.itemsJson).map((item: any, i: number) => (
                                   <div key={i} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                                      <div className="flex items-center gap-3">
                                         <div className="w-8 h-8 bg-white dark:bg-slate-900 rounded-lg flex items-center justify-center text-blue-600 border border-slate-100 dark:border-slate-800 shadow-sm">
                                            <Package size={14} />
                                         </div>
                                         <div>
                                            <p className="text-xs font-black text-slate-900 dark:text-white">{item.name || `Ítem #${item.productId}`}</p>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase">Talla: {item.talla || 'N/A'} • Cantidad Verificada</p>
                                         </div>
                                      </div>
                                      <span className="bg-blue-600 text-white px-3 py-1 rounded-lg text-[10px] font-black">x{item.quantity}</span>
                                   </div>
                                )) : (
                                   <div className="py-8 text-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                                      <p className="text-[10px] font-bold text-slate-400 uppercase italic">El administrador está listando los ítems...</p>
                                   </div>
                                )}
                             </div>
                           </div>

                           {/* Photos Gallery */}
                           <div>
                             <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 mb-4">
                               <ImageIcon size={14} className="text-blue-600" /> Evidencia Fotográfica
                             </h3>
                             <div className="grid grid-cols-2 gap-3">
                                {activeSession.photosJson ? JSON.parse(activeSession.photosJson).map((photo: string, i: number) => (
                                   <motion.div 
                                      key={i} 
                                      whileHover={{ scale: 1.05 }}
                                      className="aspect-square rounded-2xl overflow-hidden border-2 border-white dark:border-slate-800 shadow-md cursor-pointer"
                                   >
                                      <img src={photo} className="w-full h-full object-cover" alt="Evidencia" />
                                   </motion.div>
                                )) : (
                                   <div className="col-span-2 py-10 text-center bg-slate-50 dark:bg-slate-800/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                                      <p className="text-[10px] font-bold text-slate-400 uppercase italic">Esperando registro fotográfico...</p>
                                   </div>
                                )}
                             </div>
                           </div>
                        </div>

                        {/* Signatures & Actions */}
                        <div className="space-y-8">
                           {/* Giver Signature Display */}
                           <div>
                              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 mb-4">
                                <Signature size={14} className="text-blue-600" /> Firma de Entrega
                              </h3>
                              <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-700/50 min-h-[140px] flex flex-col items-center justify-center gap-4">
                                 {activeSession.giverSignature ? (
                                    <>
                                       <img src={activeSession.giverSignature} className="h-20 object-contain mix-blend-multiply dark:mix-blend-normal opacity-80" alt="Firma Giver" />
                                       <div className="text-center">
                                          <p className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest">{activeSession.giverFullName || 'Administrador'}</p>
                                          <p className="text-[8px] font-bold text-emerald-600 uppercase tracking-widest">Identidad Verificada</p>
                                       </div>
                                    </>
                                 ) : (
                                    <div className="flex flex-col items-center gap-3 text-slate-300">
                                       <Lock size={32} />
                                       <p className="text-[9px] font-bold uppercase tracking-widest text-center">Esperando firma del responsable</p>
                                    </div>
                                 )}
                              </div>
                           </div>

                           {/* Receiver Signature Action */}
                           <div>
                             <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 mb-4">
                               <PenLine size={14} className="text-blue-600" /> Su Firma de Aceptación
                             </h3>
                             
                             {activeSession.status === 'CREATED' ? (
                                <div className="py-20 text-center bg-slate-50 dark:bg-slate-800 rounded-3xl border border-dashed border-slate-200 flex flex-col items-center justify-center gap-4">
                                   <div className="w-16 h-16 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center shadow-sm">
                                      <Lock size={24} className="text-slate-300" />
                                   </div>
                                   <div className="space-y-1">
                                      <p className="text-[10px] font-black text-slate-900 dark:text-white uppercase">Acción Bloqueada</p>
                                      <p className="text-[9px] font-bold text-slate-400 uppercase max-w-[200px] mx-auto">Se habilitará cuando el administrador registre la evidencia.</p>
                                   </div>
                                </div>
                             ) : (
                                <div className="space-y-4">
                                   <div className="bg-white dark:bg-black/40 border-2 border-dashed border-blue-100 dark:border-blue-500/20 rounded-[2.5rem] p-6 overflow-hidden relative shadow-inner">
                                      <canvas 
                                        ref={canvasRef} width={400} height={150}
                                        className="w-full h-32 bg-blue-50/5 dark:bg-blue-500/5 rounded-2xl cursor-crosshair"
                                        onMouseDown={(e) => {
                                          const canvas = canvasRef.current;
                                          if (!canvas) return;
                                          const ctx = canvas.getContext('2d');
                                          if (!ctx) return;
                                          const rect = canvas.getBoundingClientRect();
                                          ctx.beginPath();
                                          ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
                                          drawingRef.current = true;
                                        }}
                                        onMouseMove={(e) => {
                                          if (!drawingRef.current) return;
                                          const canvas = canvasRef.current;
                                          if (!canvas) return;
                                          const ctx = canvas.getContext('2d');
                                          if (!ctx) return;
                                          const rect = canvas.getBoundingClientRect();
                                          ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
                                          ctx.strokeStyle = '#2563eb';
                                          ctx.lineWidth = 3;
                                          ctx.lineCap = 'round';
                                          ctx.stroke();
                                        }}
                                        onMouseUp={() => {
                                          drawingRef.current = false;
                                          setEmployeeSignature(canvasRef.current?.toDataURL() || '');
                                        }}
                                      />
                                      <button onClick={() => {
                                        const ctx = canvasRef.current?.getContext('2d');
                                        ctx?.clearRect(0, 0, 800, 200);
                                        setEmployeeSignature('');
                                      }} className="absolute bottom-6 right-6 text-[8px] font-black text-rose-500 bg-rose-50 px-3 py-1 rounded-full uppercase tracking-widest hover:bg-rose-100 transition-colors">
                                        Limpiar
                                      </button>
                                   </div>
                                   <button 
                                     onClick={handleSignSession}
                                     disabled={!employeeSignature || isLoading || activeSession.status === 'SIGNED' || activeSession.status === 'COMPLETED'}
                                     className="w-full bg-blue-600 hover:bg-blue-500 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-blue-600/20 disabled:opacity-50 transition-all flex items-center justify-center gap-3"
                                   >
                                      {isLoading ? <RefreshCw className="animate-spin" size={18} /> : 
                                       activeSession.status === 'SIGNED' || activeSession.status === 'COMPLETED' ? 
                                       <><CheckCircle2 size={18} /> Firma Registrada</> : 
                                       <><Signature size={18} /> Confirmar & Enviar Firma</>}
                                   </button>
                                </div>
                             )}
                           </div>
                        </div>
                     </div>

                     {(activeSession.status === 'SIGNED' || activeSession.status === 'COMPLETED') && (
                        <motion.div 
                           initial={{ opacity: 0, scale: 0.9 }} 
                           animate={{ opacity: 1, scale: 1 }}
                           className="bg-emerald-50 dark:bg-emerald-500/10 border-2 border-emerald-100 dark:border-emerald-500/20 p-8 md:p-12 rounded-[3rem] text-center space-y-6 shadow-xl shadow-emerald-500/5"
                        >
                           <div className="w-20 h-20 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto text-emerald-600 shadow-sm border border-emerald-50 dark:border-emerald-500/20">
                              <CheckCircle2 size={40} />
                           </div>
                           <div className="space-y-2">
                              <h4 className="text-2xl font-black text-emerald-900 dark:text-emerald-400 tracking-tight leading-none">¡Entrega Certificada!</h4>
                              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-500/80 max-w-sm mx-auto">Su firma ha sido recibida correctamente. Puede ver su acta en el panel principal o descargarla ahora.</p>
                           </div>
                           <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                              <button 
                                onClick={async () => {
                                   await api.completeDeliverySession(activeSession.id);
                                   setStep(1);
                                   setEmployeeDocument('');
                                   setProfile({ fullName: '', document: '', email: '', cargo: '' });
                                   setActiveSession(null);
                                }}
                                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
                              >
                                Dar por terminada la entrega
                              </button>
                           </div>
                        </motion.div>
                     )}
                  </div>
                )}
                
                <div className="flex justify-center pt-6">
                  <button 
                    onClick={() => {
                      setStep(1);
                      setEmployeeDocument('');
                      setProfile({ fullName: '', document: '', email: '', cargo: '' });
                      setPendingDelivery(null);
                      setActiveSession(null);
                    }}
                    className="group flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-rose-500 transition-colors"
                  >
                    <Eraser size={14} className="group-hover:rotate-12 transition-transform" /> Finalizar Sesión / Salir
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </section>

        {message && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-2xl flex items-center gap-3 border ${message.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700'}`}
          >
            {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <p className="text-xs font-bold">{message.text}</p>
          </motion.div>
        )}

        <footer className="text-center pb-10">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
            © 2024 Invetarx • Gestión Inteligente de Suministros
          </p>
        </footer>
      </div>
    </main>
  );
};