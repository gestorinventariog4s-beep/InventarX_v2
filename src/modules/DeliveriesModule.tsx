import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Truck, 
  Search, 
  ShieldCheck, 
  Signature, 
  UserCheck, 
  PackageCheck,
  Eraser,
  PenLine,
  RefreshCw,
  IdCard,
  Mail,
  Briefcase,
  CheckCircle2,
  AlertCircle,
  FileText,
  Download,
  X
} from 'lucide-react';
import { Product, AuthResponse } from '../types';
import * as api from '../services/api';
import { PDFViewer, PDFDownloadLink } from '@react-pdf/renderer';
import { ActaReportPDF } from '../components/ActaReportPDF';
import type { ToastType } from '../components/BottomToast';

interface DeliveriesModuleProps {
  products: Product[];
  onNotify?: (type: ToastType, message: string) => void;
  onSubmitDelivery: (delivery: { 
    employeeFullName: string;
    employeeDocument: string;
    employeeEmail: string;
    employeeCargo: string;
    items: Array<{ productId: number; quantity: number }>;
    notes: string;
    signatureDataUrl: string;
    giverSignatureDataUrl?: string;
    giverFullName?: string;
    evidencePhotos?: string[];
  }) => Promise<any>;
  isLoading: boolean;
  session?: AuthResponse | null;
  onLogout?: () => void;
}

export const DeliveriesModule: React.FC<DeliveriesModuleProps> = ({
  products,
  onNotify,
  onSubmitDelivery,
  isLoading,
  session,
  onLogout
}) => {
  const [step, setStep] = useState(1);
  const [searchId, setSearchId] = useState('');
  const [employeeProfile, setEmployeeProfile] = useState<api.EmployeeProfile | null>(null);
  const [cart, setCart] = useState<Record<number, number>>({});
  const [notes, setNotes] = useState('');
  const [signatureDataUrl, setSignatureDataUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [generatedActa, setGeneratedActa] = useState<any>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [pendingDelivery, setPendingDelivery] = useState<any>(null);
  const [isLoadingPending, setIsLoadingPending] = useState(false);
  const [evidencePhotos, setEvidencePhotos] = useState<string[]>([]);
  const [currentSession, setCurrentSession] = useState<api.DeliverySession | null>(null);
  const [giverSignature, setGiverSignature] = useState('');
  const [pendingEmployees, setPendingEmployees] = useState<any[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const giverCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const drawingRef = useRef(false);
  const drawingGiverRef = useRef(false);

  React.useEffect(() => {
    let interval: any;
    const fetchPending = async () => {
      if (session) {
        try {
          const list = await api.getPendingEmployees(session, onLogout || (() => {}));
          setPendingEmployees(list || []);
        } catch (e) {
          console.error("Error fetching pending employees:", e);
        }
      }
    };

    fetchPending();
    interval = setInterval(fetchPending, 3000);
    return () => clearInterval(interval);
  }, [session, onLogout]);

  const handleSelectCollaborator = async (doc: string) => {
    if (!doc) return;
    setError(null);
    setIsLoadingPending(true);
    try {
      const profile = await api.getEmployee(doc);
      setEmployeeProfile(profile);
      setSearchId(profile.document);
      
      let pending: any = null;
      try {
        pending = await api.getPendingDelivery(profile.document);
        if (pending) {
          setPendingDelivery(pending);
          const newCart: Record<number, number> = {};
          pending.items.forEach((item: any) => {
            newCart[item.product.id] = item.quantity;
          });
          setCart(newCart);
        } else {
          setPendingDelivery(null);
          setCart({});
        }
      } catch (err) {
        console.error("Error loading pending delivery:", err);
        setPendingDelivery(null);
      }
      
      setStep(2);
      // Start a live session
      const sess = await api.startDeliverySession(profile.document);
      setCurrentSession(sess);

      // Sync initial cart to session immediately if there is a pending delivery
      if (sess && pending) {
        const selected = pending.items.map((item: any) => {
          const product = products.find(p => p.id === item.product.id);
          return {
            productId: item.product.id,
            name: product ? product.name : `Ítem #${item.product.id}`,
            talla: product ? product.talla : 'N/A',
            quantity: item.quantity
          };
        });
        await api.updateSessionItems(sess.id, JSON.stringify(selected));
      }
    } catch (e) {
      setError("Colaborador no encontrado. Asegúrese que el colaborador se haya registrado en el portal.");
    } finally {
      setIsLoadingPending(false);
    }
  };

  const handleRemovePendingEmployee = async (empId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("¿Está seguro que desea eliminar a este colaborador de la lista de espera?")) return;
    try {
      await api.updateEmployeeState(empId, 'INICIAL', session || null, onLogout || (() => {}));
      setPendingEmployees(prev => prev.filter(emp => emp.id !== empId));
      if (onNotify) onNotify('success', 'Colaborador removido de la lista de espera.');
    } catch (err) {
      console.error("Error removing pending employee:", err);
      if (onNotify) onNotify('error', 'No se pudo remover al colaborador de la lista de espera.');
    }
  };

  const updateCartItemQuantity = async (productId: number, quantity: number) => {
    const newCart = { ...cart, [productId]: quantity };
    setCart(newCart);

    if (currentSession) {
      const selected = Object.entries(newCart)
        .filter(([, qty]) => qty > 0)
        .map(([id, qty]) => {
          const prodId = Number(id);
          const product = products.find(p => p.id === prodId);
          return {
            productId: prodId,
            name: product ? product.name : `Ítem #${prodId}`,
            talla: product ? product.talla : 'N/A',
            quantity: qty
          };
        });
      
      try {
        await api.updateSessionItems(currentSession.id, JSON.stringify(selected));
      } catch (err) {
        console.error("Error updating session items:", err);
      }
    }
  };

  const handleIdentify = async () => {
    if (!searchId.trim()) return;
    await handleSelectCollaborator(searchId.trim());
  };

  // Polling for employee signature
  React.useEffect(() => {
    let interval: any;
    if (currentSession && currentSession.status === 'EVIDENCE_READY') {
      interval = setInterval(async () => {
        try {
          const session = await api.getActiveDeliverySession(currentSession.employeeDocument);
          if (session.status === 'SIGNED' || session.receiverSignature) {
            setCurrentSession(session);
            setSignatureDataUrl(session.receiverSignature);
            clearInterval(interval);
          }
        } catch (e) {
          console.error("Polling error:", e);
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [currentSession]);

  const selectedProducts = Object.entries(cart)
    .filter(([, qty]) => qty > 0)
    .map(([id, qty]) => ({ productId: Number(id), quantity: qty }));

  const getSelectedProductsRich = () => {
    return Object.entries(cart)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => {
        const prodId = Number(id);
        const product = products.find(p => p.id === prodId);
        return {
          productId: prodId,
          name: product ? product.name : `Ítem #${prodId}`,
          talla: product ? product.talla : 'N/A',
          quantity: qty
        };
      });
  };

  const getCanvasPoint = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const isTouchEvent = 'touches' in event;
    const clientX = isTouchEvent ? (event as React.TouchEvent).touches[0].clientX : (event as React.MouseEvent).clientX;
    const clientY = isTouchEvent ? (event as React.TouchEvent).touches[0].clientY : (event as React.MouseEvent).clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDrawing = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCanvasPoint(event);
    ctx.beginPath();
    ctx.moveTo(x, y);
    drawingRef.current = true;
  };

  const draw = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCanvasPoint(event);
    ctx.lineTo(x, y);
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.stroke();
  };

  const endDrawing = () => {
    drawingRef.current = false;
    if (canvasRef.current) {
      setSignatureDataUrl(canvasRef.current.toDataURL());
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureDataUrl('');
  };
  
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEvidencePhotos(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    setEvidencePhotos(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6 animate-fade pb-10">
      
      {/* Header Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-blue-600 dark:bg-black/40 rounded-[2.5rem] p-8 text-white relative overflow-hidden flex flex-col justify-between min-h-[300px] shadow-xl border border-blue-500 dark:border-white/5">
          <div className="absolute -top-10 -right-10 opacity-10 pointer-events-none text-white">
            <Truck size={300} />
          </div>
          <div className="relative z-10 space-y-4">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 px-4 py-1.5 rounded-xl">
              <ShieldCheck size={14} className="text-emerald-400" />
              <span className="text-[9px] font-black uppercase tracking-[0.2em]">Entrega Certificada</span>
            </div>
            <h1 className="text-5xl font-black tracking-tighter leading-none">
              Despacho de <br /> <span className="text-blue-100 dark:text-blue-400">Dotación</span>
            </h1>
            <p className="text-blue-50 max-w-md text-sm font-medium leading-relaxed opacity-80">
              Protocolo de entrega institucional. El administrador gestiona los ítems y la evidencia de recepción.
            </p>
          </div>
        </div>

        <div className="lg:col-span-4 bg-white dark:bg-white/5 border border-blue-100 dark:border-white/10 rounded-[2.5rem] p-8 flex flex-col justify-center shadow-sm relative overflow-hidden">
          <AnimatePresence mode="wait">
            {!employeeProfile ? (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-4">
                <div className="w-16 h-16 bg-blue-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto text-blue-300">
                  <IdCard size={32} />
                </div>
                <div>
                  <p className="text-blue-900 dark:text-white font-black text-sm uppercase tracking-widest">Esperando ID</p>
                  <p className="text-[9px] font-bold text-blue-400 mt-1 uppercase">Identifique al colaborador</p>
                </div>
              </motion.div>
            ) : (
              <motion.div key="user" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                <div className="flex items-center gap-4">
                   <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-xl font-black shadow-lg">
                     {employeeProfile.fullName.charAt(0)}
                   </div>
                   <div className="flex-1 min-w-0">
                     <p className="text-blue-900 dark:text-white font-black text-base leading-tight truncate">{employeeProfile.fullName}</p>
                     <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest">{employeeProfile.document}</p>
                   </div>
                </div>
                <div className="space-y-2">
                   <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                      <Briefcase size={12} /> {employeeProfile.cargo}
                   </div>
                   <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                      <Mail size={12} /> {employeeProfile.email}
                   </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="bg-white dark:bg-white/5 border border-blue-100 dark:border-white/10 rounded-[2.5rem] p-8 shadow-sm">
        <div className="max-w-4xl mx-auto">
          
          <div className="flex justify-between items-center mb-10 relative px-10">
             <div className="absolute top-1/2 left-0 w-full h-0.5 bg-blue-50 dark:bg-white/5 -translate-y-1/2 -z-10" />
             {[1, 2, 3].map((s) => (
               <div key={s} className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm transition-all border-4 ${step >= s ? 'bg-blue-600 border-blue-100 text-white' : 'bg-white border-blue-50 text-blue-200'}`}>
                 {s}
               </div>
             ))}
          </div>

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 text-center">
                 <div className="space-y-6">
                   <h3 className="text-2xl font-black text-blue-900 dark:text-white tracking-tighter">Búsqueda de Colaborador</h3>
                   <div className="relative max-w-sm mx-auto">
                     <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-600" size={18} />
                     <input 
                      className="w-full bg-blue-50/50 dark:bg-white/5 border-none rounded-xl py-4 pl-12 pr-4 text-sm font-black text-blue-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20"
                      placeholder="Ingrese Cédula del Colaborador..."
                      value={searchId} onChange={(e) => setSearchId(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleIdentify()}
                     />
                   </div>
                   {error && (
                     <div className="flex items-center gap-2 justify-center text-rose-500 text-[10px] font-black uppercase italic">
                        <AlertCircle size={14} /> {error}
                     </div>
                   )}
                   <button onClick={handleIdentify} disabled={isLoadingPending} className="bg-blue-600 text-white px-10 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-500 transition-all shadow-xl shadow-blue-600/10 disabled:opacity-50">
                     {isLoadingPending ? <RefreshCw className="animate-spin mx-auto" /> : "Validar Colaborador"}
                   </button>
                 </div>

                 {/* Live Waiting Queue */}
                 <div className="max-w-xl mx-auto mt-8 pt-8 border-t border-slate-100 dark:border-white/5 space-y-4">
                   <div className="flex items-center justify-between">
                     <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                       <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                       Colaboradores en Espera (En Vivo)
                     </h4>
                     <span className="bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-md text-[9px] font-black">
                       {pendingEmployees.length} activos
                     </span>
                   </div>
                   
                   {pendingEmployees.length === 0 ? (
                     <div className="py-8 bg-slate-50/50 dark:bg-white/5 rounded-2xl border border-dashed border-slate-200 dark:border-white/10 text-center">
                       <p className="text-[10px] font-bold text-slate-400 uppercase italic">
                         Esperando que los colaboradores registren su información...
                       </p>
                     </div>
                   ) : (
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[220px] overflow-y-auto pr-1">
                       {pendingEmployees.map((emp) => (
                         <div
                           key={emp.id}
                           
                           className="flex items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/5 transition-all text-left group"
                         >
                           <div className="flex items-center gap-3 min-w-0 flex-1"><div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 font-black text-sm uppercase group-hover:bg-blue-600 group-hover:text-white transition-all">
                             {emp.fullName ? emp.fullName.charAt(0) : '?'}
                           </div>
                           <div className="flex-1 min-w-0">
                             <p className="text-xs font-black text-slate-800 dark:text-slate-200 truncate leading-tight group-hover:text-blue-600 transition-colors">
                               {emp.fullName}
                             </p>
                             <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                               {emp.cargo} • {emp.document}
                             </p>
                           </div>
                           </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => handleSelectCollaborator(emp.document)}
                                title="Iniciar Despacho"
                                className="w-7 h-7 rounded-lg bg-emerald-50 hover:bg-emerald-500 text-emerald-600 hover:text-white dark:bg-emerald-500/10 dark:text-emerald-400 flex items-center justify-center transition-all"
                              >
                                <CheckCircle2 size={14} />
                              </button>
                              <button
                                onClick={(e) => handleRemovePendingEmployee(emp.id, e)}
                                title="Eliminar de Espera"
                                className="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-500 text-rose-600 hover:text-white dark:bg-rose-500/10 dark:text-rose-400 flex items-center justify-center transition-all"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </div>
                       ))}
                     </div>
                   )}
                 </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                 <div className="flex justify-between items-end">
                    <div>
                      <h3 className="text-2xl font-black text-blue-900 dark:text-white tracking-tighter">Selección de Dotación</h3>
                      <div className="flex flex-wrap items-center gap-3 mt-2">
                        {pendingDelivery ? (
                          <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-100 dark:border-emerald-500/20">
                            <CheckCircle2 size={12} className="text-emerald-500" />
                            <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Dotación Pre-asignada</p>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-500/10 px-3 py-1 rounded-full border border-blue-100 dark:border-blue-500/20">
                            <PackageCheck size={12} className="text-blue-500" />
                            <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest">Entrega Manual</p>
                          </div>
                        )}
                        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700">
                          <UserCheck size={12} className="text-slate-500" />
                          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{employeeProfile?.fullName}</p>
                        </div>
                      </div>
                    </div>
                    <button onClick={() => {
                      setStep(1);
                      setPendingDelivery(null);
                      setCart({});
                    }} className="text-[9px] font-black text-blue-500 uppercase tracking-widest hover:text-blue-700 underline">Cambiar Colaborador</button>
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[400px] overflow-y-auto pr-2">
                    {products.map(p => (
                      <div 
                        key={p.id}
                        className={`p-5 rounded-2xl border transition-all ${cart[p.id] ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-white/10 text-slate-900 dark:text-white'}`}
                      >
                         <div className="flex justify-between items-start mb-3">
                            <PackageCheck size={24} className={cart[p.id] ? 'text-blue-200' : 'text-blue-600'} />
                            <input 
                              type="number" 
                              min={0}
                              value={cart[p.id] || 0}
                              onChange={(e) => updateCartItemQuantity(p.id, Number(e.target.value))}
                              className={`w-12 rounded-lg p-1 text-xs font-black text-center outline-none ${cart[p.id] ? 'bg-blue-500 text-white' : 'bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10'}`}
                            />
                         </div>
                         <p className="font-black text-sm leading-tight mb-1">{p.name}</p>
                         <p translate="no" className={`notranslate text-[10px] font-bold ${cart[p.id] ? 'text-blue-100' : 'text-slate-400'}`}>Talla: {p.talla || 'N/A'}</p>
                      </div>
                    ))}
                 </div>

                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Observaciones de Entrega</label>
                    <textarea 
                      value={notes} onChange={e => setNotes(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-2xl p-4 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 min-h-[100px]"
                      placeholder="Notas adicionales sobre la entrega..."
                    />
                 </div>

                 <button 
                   onClick={async () => {
                      if (currentSession) {
                        await api.updateSessionEvidence(currentSession.id, {
                          itemsJson: JSON.stringify(getSelectedProductsRich()),
                          photosJson: JSON.stringify(evidencePhotos),
                          giverSignature: '', // Not signed yet
                          giverFullName: 'Administrador'
                        });
                      }
                      setStep(3);
                   }} 
                   disabled={selectedProducts.length === 0} 
                   className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl shadow-blue-600/20"
                 >
                   Proceder a Firma & Evidencia
                 </button>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                 <div className="text-center">
                    <h3 className="text-2xl font-black text-blue-900 dark:text-white tracking-tighter">Firma & Evidencias</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Capture fotos de los elementos y la firma del colaborador.</p>
                 </div>

                 {/* Phase 1: Admin Evidence */}
                 <div className="space-y-4">
                    <div className="flex items-center justify-between">
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                          <PackageCheck size={14} className="text-blue-500" /> 1. Registro de Evidencia Física (Administrador)
                       </label>
                       {evidencePhotos.length > 0 && (
                          <div className="flex items-center gap-1 text-emerald-500 text-[9px] font-black uppercase">
                             <CheckCircle2 size={12} /> {evidencePhotos.length} {evidencePhotos.length === 1 ? 'Foto' : 'Fotos'} Registradas
                          </div>
                       )}
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                       {evidencePhotos.map((photo, i) => (
                          <div key={i} className="aspect-square rounded-2xl overflow-hidden relative group border-2 border-blue-100 shadow-sm">
                             <img src={photo} className="w-full h-full object-cover" alt="Evidencia" />
                             <button 
                               onClick={() => removePhoto(i)}
                               className="absolute top-2 right-2 w-6 h-6 bg-rose-500 text-white rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                             >
                                <X size={14} />
                             </button>
                          </div>
                       ))}
                       <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="aspect-square rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/30 flex flex-col items-center justify-center gap-2 text-blue-400 hover:bg-blue-50 hover:border-blue-300 transition-all group"
                       >
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                             <PenLine size={20} />
                          </div>
                          <span className="text-[9px] font-black uppercase">Adjuntar Foto</span>
                       </button>
                       <input 
                        type="file" accept="image/*" multiple capture="environment" 
                        ref={fileInputRef} className="hidden" onChange={handlePhotoUpload} 
                       />
                    </div>
                 </div>

                 {/* Phase 1.5: Giver (Admin) Signature */}
                 <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                       <Signature size={14} className="text-blue-500" /> 2. Firma Quien Entrega (Administrador)
                    </label>
                    <div className="bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-3xl p-4">
                        <canvas 
                          ref={giverCanvasRef} width={600} height={120}
                          className="w-full h-24 bg-white/50 rounded-xl cursor-crosshair border border-dashed border-slate-300"
                          onMouseDown={(e) => {
                            const canvas = giverCanvasRef.current;
                            if (!canvas) return;
                            const ctx = canvas.getContext('2d');
                            if (!ctx) return;
                            const rect = canvas.getBoundingClientRect();
                            ctx.beginPath();
                            ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
                            drawingGiverRef.current = true;
                          }}
                          onMouseMove={(e) => {
                            if (!drawingGiverRef.current) return;
                            const canvas = giverCanvasRef.current;
                            if (!canvas) return;
                            const ctx = canvas.getContext('2d');
                            if (!ctx) return;
                            const rect = canvas.getBoundingClientRect();
                            ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
                            ctx.strokeStyle = '#2563eb';
                            ctx.lineWidth = 2;
                            ctx.stroke();
                          }}
                          onMouseUp={() => {
                            drawingGiverRef.current = false;
                            setGiverSignature(giverCanvasRef.current?.toDataURL() || '');
                          }}
                          onTouchStart={(e) => {
                            const canvas = giverCanvasRef.current;
                            if (!canvas) return;
                            const ctx = canvas.getContext('2d');
                            if (!ctx) return;
                            const rect = canvas.getBoundingClientRect();
                            const touch = e.touches[0];
                            ctx.beginPath();
                            ctx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top);
                            drawingGiverRef.current = true;
                            e.preventDefault();
                          }}
                          onTouchMove={(e) => {
                            if (!drawingGiverRef.current) return;
                            const canvas = giverCanvasRef.current;
                            if (!canvas) return;
                            const ctx = canvas.getContext('2d');
                            if (!ctx) return;
                            const rect = canvas.getBoundingClientRect();
                            const touch = e.touches[0];
                            ctx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top);
                            ctx.strokeStyle = '#2563eb';
                            ctx.lineWidth = 2;
                            ctx.stroke();
                            e.preventDefault();
                          }}
                          onTouchEnd={() => {
                            drawingGiverRef.current = false;
                            setGiverSignature(giverCanvasRef.current?.toDataURL() || '');
                          }}
                        />
                        <button onClick={() => {
                          const ctx = giverCanvasRef.current?.getContext('2d');
                          ctx?.clearRect(0, 0, 800, 200);
                          setGiverSignature('');
                        }} className="text-[9px] font-black text-rose-500 uppercase tracking-widest mt-2 flex items-center gap-1">
                          <Eraser size={12} /> Limpiar
                        </button>
                    </div>
                    <button 
                      onClick={async () => {
                        if (currentSession && giverSignature) {
                           const updated = await api.updateSessionEvidence(currentSession.id, {
                              itemsJson: JSON.stringify(getSelectedProductsRich()),
                              photosJson: JSON.stringify(evidencePhotos),
                              giverSignature: giverSignature,
                              giverFullName: 'Administrador Central'
                           });
                           setCurrentSession(updated);
                        }
                      }}
                      className="text-[9px] font-black bg-blue-100 text-blue-700 px-4 py-2 rounded-lg uppercase tracking-widest"
                    >
                      Publicar Evidencia para el Colaborador
                    </button>
                 </div>

                  {/* Phase 2: Employee Signature */}
                 <div className={`space-y-4 transition-all duration-500 ${evidencePhotos.length === 0 || !giverSignature ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                    <div className="flex items-center justify-between">
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                          <Signature size={14} className="text-blue-500" /> 3. Firma de Aceptación (Colaborador)
                       </label>
                       {signatureDataUrl ? (
                          <div className="flex items-center gap-1 text-emerald-500 text-[9px] font-black uppercase">
                             <CheckCircle2 size={12} /> Firma Recibida (Remota)
                          </div>
                       ) : (
                          <div className="flex items-center gap-1 text-blue-500 text-[9px] font-black uppercase animate-pulse">
                             <RefreshCw size={12} className="animate-spin" /> Esperando Firma Remota...
                          </div>
                       )}
                    </div>
                    
                    <div className="bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-3xl p-4 md:p-8">
                        {signatureDataUrl ? (
                           <img src={signatureDataUrl} className="w-full h-32 object-contain bg-white/50 rounded-2xl p-2" alt="Firma Colaborador" />
                        ) : (
                           <div className="bg-white dark:bg-white/5 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-2 overflow-hidden relative">
                              <canvas 
                                ref={canvasRef} width={800} height={200}
                                className="w-full h-40 bg-blue-50/20 rounded-xl cursor-crosshair"
                                onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={endDrawing} onMouseLeave={endDrawing}
                                onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={endDrawing}
                              />
                              <button onClick={clearSignature} className="absolute bottom-6 right-6 text-[9px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-1 hover:underline">
                                <Eraser size={14} /> Limpiar Firma (Local)
                              </button>
                           </div>
                        )}
                    </div>
                    
                    {(!giverSignature || evidencePhotos.length === 0) && (
                       <p className="text-center text-[9px] font-black text-amber-500 uppercase italic">
                          * Debe registrar fotos y firmar como administrador para habilitar la firma del colaborador
                       </p>
                    )}
                 </div>

                 <div className="flex gap-4">
                    <button onClick={() => setStep(2)} className="flex-1 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-600 dark:text-white">Atrás</button>
                    <button
                      onClick={async () => {
                        if (!signatureDataUrl || evidencePhotos.length === 0 || !giverSignature) return;
                        try {
                           const response = await onSubmitDelivery({
                             employeeFullName: employeeProfile?.fullName || '',
                             employeeDocument: employeeProfile?.document || '',
                             employeeEmail: employeeProfile?.email || '',
                             employeeCargo: employeeProfile?.cargo || '',
                             items: selectedProducts,
                             notes,
                             signatureDataUrl,
                             giverSignatureDataUrl: giverSignature,
                             giverFullName: 'Administrador Central',
                             evidencePhotos
                           });
                          
                          if (currentSession) {
                             await api.completeDeliverySession(currentSession.id);
                          }
                          
                          const actaData = {
                            nombre: employeeProfile?.fullName || 'N/A',
                            identificacion: employeeProfile?.document || 'N/A',
                            cargo: employeeProfile?.cargo || 'N/A',
                            nroActa: response.actaNumber || 'S/N',
                            articulos: selectedProducts.map(sp => {
                               const p = products.find(prod => prod.id === sp.productId);
                               return {
                                  descripcion: p?.name || 'N/A',
                                  talla: p?.talla || 'N/A',
                                  cantidad: sp.quantity,
                                  imagen: ''
                               };
                            }),
                             firmaBase64: signatureDataUrl,
                             firmaGiverBase64: giverSignature,
                             nombreGiver: 'Administrador Central',
                             evidencias: evidencePhotos
                           };
                           
                           setGeneratedActa(actaData);
                           setShowSuccessModal(true);
                           
                         } catch (e) {
                           onNotify?.('error', 'Error al finalizar la entrega.');
                         }
                       }}
                       disabled={isLoading || !signatureDataUrl || evidencePhotos.length === 0 || !giverSignature}
                      className="flex-[2] bg-blue-600 hover:bg-blue-500 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-blue-600/20 disabled:opacity-50"
                    >
                      {isLoading ? <RefreshCw className="animate-spin mx-auto" /> : <><ShieldCheck size={18} className="inline mr-2" /> Finalizar & Generar Acta</>}
                    </button>
                 </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Success Modal with PDF Preview */}
      <AnimatePresence>
        {showSuccessModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 w-full max-w-5xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-blue-600 text-white">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                    <CheckCircle2 size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black tracking-tight">Entrega Exitosa</h2>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Acta Generada: {generatedActa?.nroActa}</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setShowSuccessModal(false);
                    setStep(1);
                    setEmployeeProfile(null);
                    setCart({});
                    setNotes('');
                    setSignatureDataUrl('');
                    setSearchId('');
                    setEvidencePhotos([]);
                  }}
                  className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                <div className="md:w-1/3 p-8 space-y-6 bg-slate-50 dark:bg-slate-800/50">
                   <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Resumen de Entrega</p>
                      <div className="space-y-4">
                         <div className="flex items-center gap-3">
                            <UserCheck className="text-blue-600" size={16} />
                            <div>
                               <p className="text-xs font-black text-slate-900 dark:text-white">{generatedActa?.nombre}</p>
                               <p className="text-[9px] font-bold text-slate-400">{generatedActa?.identificacion}</p>
                            </div>
                         </div>
                         <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Artículos</p>
                            <div className="space-y-2">
                               {generatedActa?.articulos.map((art: any, i: number) => (
                                 <div key={i} className="flex justify-between text-[10px] font-bold text-slate-700 dark:text-slate-300">
                                    <span>{art.descripcion}</span>
                                    <span className="text-blue-600">x{art.cantidad}</span>
                                 </div>
                               ))}
                            </div>
                         </div>
                      </div>
                   </div>

                   <div className="space-y-4">
                      <PDFDownloadLink 
                        document={<ActaReportPDF {...generatedActa} />} 
                        fileName={`acta-${generatedActa?.nroActa}.pdf`}
                        className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:opacity-90 transition-all"
                      >
                         {({ loading }) => (
                           loading ? 'Preparando Descarga...' : <><Download size={16} /> Descargar Acta PDF</>
                         )}
                      </PDFDownloadLink>
                      
                      <button className="w-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white py-4 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-50 transition-all">
                         <Mail size={16} /> Enviar por Correo
                      </button>
                   </div>
                </div>

                <div className="flex-1 bg-slate-200 dark:bg-slate-950 p-4 flex flex-col">
                   <div className="flex items-center justify-between mb-4 px-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                         <FileText size={14} /> Vista Previa del Documento
                      </p>
                      <span className="text-[9px] font-bold text-slate-400">PDF Institucional</span>
                   </div>
                   <div className="flex-1 rounded-2xl overflow-hidden border border-slate-300 dark:border-white/5 bg-white shadow-inner">
                      <PDFViewer width="100%" height="100%" style={{ border: 'none' }} showToolbar={false}>
                        <ActaReportPDF {...generatedActa} />
                      </PDFViewer>
                   </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
