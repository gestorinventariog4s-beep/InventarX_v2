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
  Download, Camera,
  X
} from 'lucide-react';
import { Product, AuthResponse } from '../types';
import * as api from '../services/api';
import { PDFViewer, PDFDownloadLink } from '@react-pdf/renderer';
import { ActaReportPDF } from '../components/ActaReportPDF';
import type { ToastType } from '../components/BottomToast';
import { ConfirmModal } from '../components/ConfirmModal';

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
  const [cart, setCart] = useState<Record<number, { quantity: number; talla: string }>>({});
  const [notes, setNotes] = useState('');
  const [signatureDataUrl, setSignatureDataUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [generatedActa, setGeneratedActa] = useState<any>(null);
  const [confirmConfig, setConfirmConfig] = useState<{isOpen: boolean; empId: number | null}>({isOpen: false, empId: null});
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [pendingDelivery, setPendingDelivery] = useState<any>(null);
  const [isLoadingPending, setIsLoadingPending] = useState(false);
  const [evidencePhotos, setEvidencePhotos] = useState<string[]>([]);
  const [currentSession, setCurrentSession] = useState<api.DeliverySession | null>(null);
  const [giverSignature, setGiverSignature] = useState('');
  const [pendingEmployees, setPendingEmployees] = useState<any[]>([]);
  const [isResending, setIsResending] = useState<Record<string, boolean>>({});
  const [productSearch, setProductSearch] = useState('');
  const [productCategory, setProductCategory] = useState('ALL');
  const [receiverSelfie, setReceiverSelfie] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const pointsRef = useRef<{ x: number; y: number }[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const drawingRef = useRef(false);

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
        if (!pending) throw new Error("No pending");
        setPendingDelivery(pending);
        const newCart: Record<number, { quantity: number; talla: string }> = {};
        if (pending.detalles) {
          pending.detalles.forEach((item: any) => {
            const prodId = Number(item.productoId) || item.productoId;
            newCart[prodId] = {
              quantity: item.cantidad,
              talla: item.talla || 'M'
            };
          });
        }
        setCart(newCart);
      } catch (err) {
        console.error("Error loading pending delivery:", err);
        throw new Error("El colaborador no ha iniciado una solicitud a través del código QR. Por favor indíquele que escanee el código en la entrada.");
      }
      
      setStep(2);
      // Start a live session
      const sess = await api.iniciarEntregaAdmin(pending.id, session?.username || 'admin', session || null, onLogout || (() => {}));
      
      // Adapt session to frontend format
      const adaptedSession = {
        id: sess.id,
        employeeDocument: sess.receptorDocumento,
        status: sess.estado === 'PENDIENTE_DESPACHO' ? 'CREATED' :
                sess.estado === 'EN_PROCESO' ? 'EVIDENCE_READY' :
                sess.estado === 'ESPERANDO_RECEPTOR' ? 'SIGNED' :
                sess.estado === 'ENTREGADO' ? 'COMPLETED' : 'ABANDONED',
        itemsJson: JSON.stringify((sess.detalles || []).map((d: any) => ({
          productId: Number(d.productoId) || d.productoId,
          quantity: d.cantidad,
          talla: d.talla,
          name: d.producto?.nombre || `Ítem #${d.productoId}`
        }))),
        photosJson: '[]',
        giverSignature: '', 
        giverFullName: session?.fullName || session?.username || 'Administrador'
      };
      
      setCurrentSession(adaptedSession as any);
    } catch (e) {
      setError("Colaborador no encontrado. Asegúrese que el colaborador se haya registrado en el portal.");
    } finally {
      setIsLoadingPending(false);
    }
  };

  const requestRemovePendingEmployee = (empId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmConfig({ isOpen: true, empId });
  };

  const executeRemovePendingEmployee = async () => {
    if (confirmConfig.empId === null) return;
    const empId = confirmConfig.empId;
    setConfirmConfig({ isOpen: false, empId: null });
    try {
      await api.updateEmployeeState(empId, 'INICIAL', session || null, onLogout || (() => {}));
      setPendingEmployees(prev => prev.filter(emp => emp.id !== empId));
      if (onNotify) onNotify('success', 'Colaborador removido de la lista de espera.');
    } catch (err) {
      console.error("Error removing pending employee:", err);
      if (onNotify) onNotify('error', 'No se pudo remover al colaborador de la lista de espera.');
    }
  };

  const handleResendEmail = async (document: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResending(prev => ({ ...prev, [document]: true }));
    try {
      await api.resendDeliveryEmail(document, session || null, onLogout || (() => {}));
      if (onNotify) onNotify('success', 'Correo de aceptación enviado con éxito.');
    } catch (err) {
      console.error("Error resending email:", err);
      if (onNotify) onNotify('error', 'No se pudo enviar el correo de aceptación.');
    } finally {
      setIsResending(prev => ({ ...prev, [document]: false }));
    }
  };

  const updateCartItemQuantity = async (productId: number, quantity: number, talla?: string) => {
    const currentItem = cart[productId];
    const currentTalla = talla || currentItem?.talla || products.find(p => p.id === productId)?.sizeStocks?.[0]?.talla || 'M';
    
    const newCart = { 
      ...cart, 
      [productId]: { quantity, talla: currentTalla }
    };
    setCart(newCart);

    if (currentSession) {
      const selected = Object.entries(newCart)
        .filter(([, item]) => item.quantity > 0)
        .map(([id, item]) => {
          const prodId = Number(id);
          const product = products.find(p => p.id === prodId);
          return {
            productId: prodId,
            name: product ? product.name : `Ítem #${prodId}`,
            talla: item.talla,
            quantity: item.quantity
          };
        });
      
      try {
        await api.updateSessionItemsAdmin(currentSession.id.toString(), selected, session || null, onLogout || (() => {}));
      } catch (err) {
        console.error('Error updating session items:', err);
      }
    }
  };

  const handleIdentify = async () => {
    if (!searchId.trim()) return;
    await handleSelectCollaborator(searchId.trim());
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
                          p.sku.toLowerCase().includes(productSearch.toLowerCase());
    
    const matchesCategory = productCategory === 'ALL' || 
                            (p.category?.name && p.category.name.toUpperCase() === productCategory.toUpperCase());
    
    return matchesSearch && matchesCategory;
  });

  const selectedProducts = Object.entries(cart)
    .filter(([, item]) => item.quantity > 0)
    .map(([id, item]) => ({ 
      productId: Number(id), 
      quantity: item.quantity,
      talla: item.talla
    }));

  const getSelectedProductsRich = () => {
    return Object.entries(cart)
      .filter(([, item]) => item.quantity > 0)
      .map(([id, item]) => {
        const prodId = Number(id);
        const product = products.find(p => p.id === prodId);
        return {
          productId: prodId,
          name: product ? product.name : `Ítem #${prodId}`,
          talla: item.talla,
          quantity: item.quantity
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

  const generateCorporateGiverSignature = (userName: string, role: string) => {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // Beautiful light slate corporate stamp background
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, 600, 200);

    // Navy/Blue corporate borders
    ctx.strokeStyle = '#1e3a8a';
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, 580, 180);

    // Yellow gold cert line
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(16, 16, 568, 168);

    // Digital Seal Icon Frame
    ctx.beginPath();
    ctx.arc(65, 100, 32, 0, 2 * Math.PI);
    ctx.fillStyle = '#1e3a8a';
    ctx.fill();

    // Checkmark inside icon
    ctx.beginPath();
    ctx.moveTo(53, 100);
    ctx.lineTo(61, 108);
    ctx.lineTo(77, 92);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Official Seal Labels
    ctx.fillStyle = '#0f172a';
    ctx.font = '900 12px sans-serif';
    ctx.fillText('CERTIFICACIÓN DE ENTREGA CORPORATIVA', 120, 50);

    ctx.fillStyle = '#2563eb';
    ctx.font = '900 18px sans-serif';
    ctx.fillText(userName.toUpperCase(), 120, 80);

    ctx.fillStyle = '#475569';
    ctx.font = '850 10px sans-serif';
    ctx.fillText(`CARGO ADMINISTRATIVO: ${role.toUpperCase()}`, 120, 105);

    const dateStr = new Date().toLocaleString('es-ES', { timeZone: 'America/Bogota' });
    ctx.fillText(`FECHA CERTIFICADO: ${dateStr} (COLOMBIA)`, 120, 125);

    const secHash = 'INV-' + Math.random().toString(36).substring(2, 9).toUpperCase();
    ctx.fillText(`SISTEMA INVENTARX - SELLO DIGITAL NRO: ${secHash}`, 120, 145);

    ctx.fillStyle = '#d97706';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('★ AVALADO POR EL SISTEMA GENERAL DE DOTACIÓN ★', 120, 168);

    return canvas.toDataURL();
  };

  // Auto-generate admin corporate seal when admin proceeds to sign
  React.useEffect(() => {
    if (step === 3 && session && !giverSignature) {
      const seal = generateCorporateGiverSignature(session.fullName || session.username, session.role || 'ADMINISTRADOR');
      setGiverSignature(seal);
    }
  }, [step, session, giverSignature]);

  // Webcam/Camera management methods for colaborador selfie
  const startCamera = async () => {
    setIsCameraActive(true);
    setReceiverSelfie('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Camera access error:', err);
    }
  };

  const captureSelfie = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Mirrored selfie
    ctx.translate(400, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, 400, 400);
    
    const dataUrl = canvas.toDataURL('image/jpeg');
    setReceiverSelfie(dataUrl);
    stopCamera();
  };

  const stopCamera = () => {
    setIsCameraActive(false);
    const video = videoRef.current;
    if (video && video.srcObject) {
      const stream = video.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      video.srcObject = null;
    }
  };

  // Smooth, high-fidelity signature pad drawing handlers
  const startDrawing = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.strokeStyle = '#1e3a8a'; // ink dark blue
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    const { x, y } = getCanvasPoint(event);
    pointsRef.current = [{ x, y }];
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    drawingRef.current = true;
  };

  const draw = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const { x, y } = getCanvasPoint(event);
    pointsRef.current.push({ x, y });
    
    // Redraw entire stroke path utilizing quadratic curves for high-fidelity smoothing!
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    if (pointsRef.current.length > 0) {
      ctx.moveTo(pointsRef.current[0].x, pointsRef.current[0].y);
      for (let i = 1; i < pointsRef.current.length - 1; i++) {
        const xc = (pointsRef.current[i].x + pointsRef.current[i + 1].x) / 2;
        const yc = (pointsRef.current[i].y + pointsRef.current[i + 1].y) / 2;
        ctx.quadraticCurveTo(pointsRef.current[i].x, pointsRef.current[i].y, xc, yc);
      }
      if (pointsRef.current.length > 1) {
        const last = pointsRef.current.length - 1;
        ctx.lineTo(pointsRef.current[last].x, pointsRef.current[last].y);
      }
    }
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
    pointsRef.current = [];
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
                     {(employeeProfile.fullName || '?').charAt(0).toUpperCase()}
                   </div>
                   <div className="flex-1 min-w-0">
                     <p className="text-blue-900 dark:text-white font-black text-base leading-tight truncate">{employeeProfile.fullName || 'Colaborador Desconocido'}</p>
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
                   
                   {/* Live Waiting Queue (Rediseñado como Tabla Premium Optimizada) */}
                  <div className="max-w-4xl mx-auto mt-8 pt-8 border-t border-slate-100 dark:border-white/5 space-y-4">
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
                      <div className="overflow-x-auto rounded-3xl border border-slate-100 dark:border-white/10 shadow-sm bg-white dark:bg-slate-900/50 backdrop-blur-xl">
                        <table className="w-full text-left border-collapse min-w-[700px]">
                          <thead>
                            <tr className="bg-slate-50 dark:bg-white/5 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-white/5">
                              <th className="py-3.5 px-5">Colaborador</th>
                              <th className="py-3.5 px-4">Cargo</th>
                              <th className="py-3.5 px-4">Correo</th>
                              <th className="py-3.5 px-4 text-center">Progreso Paso a Paso</th>
                              <th className="py-3.5 px-5 text-right">Acciones</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                            {pendingEmployees.map((emp) => {
                              const isDelivered = emp.processState === 'ENTREGADO';
                              const isInProgress = emp.processState === 'EN_PROCESO';
                              const isPending = emp.processState === 'PENDIENTE_ENTREGA';
                              
                              return (
                                <tr key={emp.id} className="group hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                                  <td className="py-3 px-5">
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-450 font-black text-xs uppercase group-hover:bg-blue-600 group-hover:text-white transition-all">
                                        {emp.fullName ? emp.fullName.charAt(0) : '?'}
                                      </div>
                                      <div>
                                        <p className="text-xs font-black text-slate-800 dark:text-slate-200 leading-tight group-hover:text-blue-600 transition-colors">
                                          {emp.fullName}
                                        </p>
                                        <p className="text-[9px] font-bold text-slate-400 mt-0.5 tracking-wider">
                                          C.C. {emp.document}
                                        </p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-3 px-4">
                                    <span className="text-[10px] font-extrabold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded-md uppercase tracking-wider">
                                      {emp.cargo || 'N/A'}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4">
                                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                      {emp.email || 'N/A'}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4">
                                    {/* Paso a paso live tracker */}
                                    <div className="flex items-center justify-center gap-1 max-w-[200px] mx-auto">
                                      <div className="flex items-center">
                                        <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-black ${
                                          isDelivered || isInProgress || isPending
                                            ? 'bg-emerald-500 text-white'
                                            : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                                        }`} title="Registro">1</div>
                                        <div className={`w-6 h-0.5 ${
                                          isDelivered || isInProgress
                                            ? 'bg-emerald-500'
                                            : 'bg-slate-200 dark:bg-slate-800'
                                        }`} />
                                      </div>
                                      
                                      <div className="flex items-center">
                                        <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-black ${
                                          isDelivered
                                            ? 'bg-emerald-500 text-white'
                                            : isInProgress
                                              ? 'bg-blue-600 text-white animate-pulse'
                                              : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                                        }`} title="Selección & Firma">2</div>
                                        <div className={`w-6 h-0.5 ${
                                          isDelivered
                                            ? 'bg-emerald-500'
                                            : 'bg-slate-200 dark:bg-slate-800'
                                        }`} />
                                      </div>

                                      <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-black ${
                                        isDelivered
                                          ? 'bg-emerald-500 text-white'
                                          : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                                      }`} title="Entregado">3</div>
                                    </div>
                                    <p className="text-[8px] font-black text-center mt-1 uppercase tracking-wider text-slate-400">
                                      {isDelivered ? 'Entregado' : isInProgress ? 'En Selección' : 'En Espera'}
                                    </p>
                                  </td>
                                  <td className="py-3 px-5 text-right">
                                    <div className="flex items-center justify-end gap-1.5">
                                      {/* Resend email action */}
                                      {isDelivered ? (
                                        <button
                                          onClick={(e) => handleResendEmail(emp.document, e)}
                                          disabled={isResending[emp.document]}
                                          title="Reenviar Acta por Correo"
                                          className={`px-2.5 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest flex items-center gap-1 transition-all ${
                                            isResending[emp.document]
                                              ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-400 cursor-not-allowed'
                                              : 'bg-blue-50 hover:bg-blue-500 text-blue-600 hover:text-white dark:bg-blue-500/10 dark:text-blue-400 hover:shadow-md hover:shadow-blue-500/10'
                                          }`}
                                        >
                                          {isResending[emp.document] ? (
                                            <>
                                              <RefreshCw size={10} className="animate-spin" />
                                              Enviando...
                                            </>
                                          ) : (
                                            <>
                                              <Mail size={10} />
                                              Enviar Acta
                                            </>
                                          )}
                                        </button>
                                      ) : (
                                        <button
                                          onClick={() => handleSelectCollaborator(emp.document)}
                                          title="Iniciar Entrega"
                                          className="px-2.5 py-1.5 rounded-xl text-[8px] font-black bg-emerald-50 hover:bg-emerald-500 text-emerald-600 hover:text-white dark:bg-emerald-500/10 dark:text-emerald-400 flex items-center gap-1 hover:shadow-md hover:shadow-emerald-500/10 transition-all uppercase tracking-widest"
                                        >
                                          <CheckCircle2 size={10} />
                                          Iniciar Entrega
                                        </button>
                                      )}
                                      
                                      <button
                                        onClick={(e) => requestRemovePendingEmployee(emp.id, e)}
                                        title="Eliminar de Espera"
                                        className="w-7 h-7 rounded-xl bg-rose-50 hover:bg-rose-500 text-rose-600 hover:text-white dark:bg-rose-500/10 dark:text-rose-450 flex items-center justify-center hover:shadow-md hover:shadow-rose-500/10 transition-all"
                                      >
                                        <X size={12} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
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
                 
                  {/* Buscador y Categorías de Dotación (Premium UI) */}
                  <div className="space-y-4 mb-6">
                     <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-50/50 dark:bg-white/5 p-4 rounded-3xl border border-slate-100 dark:border-white/10">
                        {/* Buscador */}
                        <div className="relative w-full md:w-96">
                           <input
                              type="text"
                              placeholder="Buscar dotación por nombre, SKU..."
                              value={productSearch}
                              onChange={e => setProductSearch(e.target.value)}
                              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl py-3 pl-10 pr-4 text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-white transition-all"
                           />
                           <Search className="absolute left-3.5 top-3.5 text-slate-400" size={15} />
                           {productSearch && (
                              <button 
                                 onClick={() => setProductSearch("")}
                                 className="absolute right-3.5 top-3.5 text-[9px] font-black text-rose-500 hover:text-rose-700 uppercase tracking-widest transition-all"
                              >
                                 Limpiar
                              </button>
                           )}
                        </div>

                        {/* Categorías (Filtros rápidos) */}
                        <div className="flex flex-wrap gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                           {["ALL", ...Array.from(new Set(products.map(p => p.category?.name).filter(Boolean)))].map(cat => {
                              const isSelected = productCategory === cat;
                              return (
                                 <button
                                    key={cat}
                                    onClick={() => setProductCategory(cat)}
                                    className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all duration-200 ${
                                       isSelected
                                          ? "bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-600/25 scale-102"
                                          : "bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-white/10"
                                    }`}
                                 >
                                    {cat === "ALL" ? "Todos" : cat}
                                 </button>
                              );
                           })}
                        </div>
                     </div>
                  </div>

                  {/* Lista de productos */}
                  {filteredProducts.length === 0 ? (
                     <div className="flex flex-col items-center justify-center p-12 bg-slate-50/30 dark:bg-white/5 rounded-3xl border border-dashed border-slate-200 dark:border-white/10 text-center min-h-[250px]">
                        <AlertCircle className="text-slate-400 mb-3 animate-pulse" size={32} />
                        <p className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">No se encontraron dotaciones</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 max-w-[280px]">Prueba escribiendo otro término de búsqueda o cambiando el filtro de categoría.</p>
                     </div>
                  ) : (
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[420px] overflow-y-auto pr-2">
                        {filteredProducts.map(p => {
                          const isInCart = cart[p.id] && cart[p.id].quantity > 0;
                          return (
                            <div 
                              key={p.id}
                              className={`p-5 rounded-3xl border transition-all duration-250 flex flex-col justify-between ${
                                 isInCart 
                                    ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/25 scale-101" 
                                    : "bg-white dark:bg-white/5 border-slate-150 dark:border-white/10 text-slate-900 dark:text-white hover:border-slate-300 dark:hover:border-white/20"
                              }`}
                            >
                               <div>
                                  <div className="flex justify-between items-start mb-3">
                                     <PackageCheck size={24} className={isInCart ? "text-blue-200" : "text-blue-600"} />
                                     <input 
                                       type="number" 
                                       min={0}
                                       value={cart[p.id]?.quantity || 0}
                                       onChange={(e) => updateCartItemQuantity(p.id, Number(e.target.value))}
                                       className={`w-12 rounded-xl p-1.5 text-xs font-black text-center outline-none transition-all ${
                                          isInCart 
                                             ? "bg-blue-500 text-white border-none focus:ring-2 focus:ring-white/20" 
                                             : "bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500/20"
                                       }`}
                                     />
                                  </div>
                                  <p className="font-black text-sm leading-tight mb-1">{p.name}</p>
                                  {p.category?.name && (
                                     <span className={`inline-block px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider mb-2.5 ${
                                        isInCart ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400"
                                     }`}>{p.category.name}</span>
                                  )}
                               </div>
                               
                               {p.sizeStocks && p.sizeStocks.length > 0 ? (
                                 <div className="mt-4 border-t border-dashed border-slate-200/20 pt-3">
                                   <label className={`text-[8px] font-black uppercase tracking-wider block mb-2 ${isInCart ? "text-blue-200" : "text-slate-400"}`}>Seleccionar Talla:</label>
                                   <div className="flex flex-wrap gap-1.5">
                                     {p.sizeStocks.map(ss => {
                                        const isSelected = (cart[p.id]?.talla || p.sizeStocks[0].talla) === ss.talla;
                                        const hasStock = ss.stock > 0;
                                        return (
                                           <button
                                              key={ss.id}
                                              onClick={() => updateCartItemQuantity(p.id, cart[p.id]?.quantity || 0, ss.talla)}
                                              className={`px-2.5 py-1.5 rounded-xl font-black text-[9px] tracking-wider transition-all duration-200 flex flex-col items-center min-w-[42px] border ${
                                                 isSelected
                                                    ? isInCart
                                                       ? "bg-white text-blue-600 border-white shadow-md scale-105"
                                                       : "bg-blue-600 text-white border-blue-500 shadow-md scale-105"
                                                    : !hasStock
                                                       ? "bg-slate-100/10 text-slate-400/40 border-slate-200/5 cursor-not-allowed line-through"
                                                       : isInCart
                                                          ? "bg-blue-700/50 text-blue-100 border-blue-600/40 hover:bg-blue-700/70 hover:text-white hover:scale-105"
                                                          : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:scale-105"
                                              }`}
                                              disabled={!hasStock && !isSelected}
                                           >
                                              <span className="font-extrabold text-[10px]">{ss.talla}</span>
                                              <span className={`text-[7px] font-black mt-0.5 ${isSelected ? (isInCart ? "text-blue-500" : "text-blue-200") : "text-slate-400"}`}>
                                                 {ss.stock}
                                              </span>
                                           </button>
                                        );
                                     })}
                                   </div>
                                 </div>
                               ) : (
                                 <div className="mt-3 border-t border-dashed border-slate-200/20 pt-2 flex justify-between items-center text-[10px] font-bold">
                                    <span className={isInCart ? "text-blue-200" : "text-slate-400"}>Talla Única:</span>
                                    <span className={isInCart ? "text-white" : "text-slate-800 dark:text-slate-200"}>{p.talla || "N/A"}</span>
                                 </div>
                               )}
                            </div>
                          );
                        })}
                     </div>
                  )}

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

                  {/* Phase 2: Sello Digital Corporativo (Administrador) */}
                  <div className="space-y-4">
                     <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <ShieldCheck size={14} className="text-blue-500" /> 2. Sello Digital Autorizado de Entrega (Administrador)
                     </label>
                     <div className="bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-3xl p-6">
                        {giverSignature ? (
                           <div className="space-y-4">
                              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2 shadow-inner max-w-xl mx-auto overflow-hidden">
                                 <img src={giverSignature} className="w-full h-auto object-contain rounded-xl" alt="Sello Corporativo" />
                              </div>
                              <div className="flex justify-center">
                                 <button 
                                    onClick={() => {
                                       const seal = generateCorporateGiverSignature(session?.fullName || session?.username || "Administrador", session?.role || "ADMIN");
                                       setGiverSignature(seal);
                                    }}
                                    className="text-[9px] font-black bg-blue-50 dark:bg-white/5 border border-blue-100 dark:border-white/10 text-blue-600 dark:text-blue-400 px-4 py-2 rounded-xl uppercase tracking-widest hover:scale-102 transition-all"
                                 >
                                    Regenerar Sello Corporativo
                                 </button>
                              </div>
                           </div>
                        ) : (
                           <div className="text-center py-6">
                              <p className="text-xs font-bold text-slate-400">Generando sello de seguridad...</p>
                           </div>
                        )}
                     </div>
                     <button 
                       onClick={async () => {
                         if (currentSession && giverSignature) {
                            const updated = await api.updateSessionEvidence(currentSession.id, {
                               itemsJson: JSON.stringify(getSelectedProductsRich()),
                               photosJson: JSON.stringify(receiverSelfie ? [receiverSelfie, ...evidencePhotos] : evidencePhotos),
                               giverSignature: giverSignature,
                               giverFullName: session?.fullName || "Administrador Central"
                            });
                            setCurrentSession(updated);
                            if (onNotify) onNotify("success", "Sello y evidencias publicados para el colaborador.");
                         }
                       }}
                       className="text-[9px] font-black bg-blue-600 text-white px-5 py-3 rounded-2xl uppercase tracking-widest shadow-md shadow-blue-500/10 hover:bg-blue-500 hover:scale-102 transition-all w-full md:w-auto"
                     >
                       Publicar Firma y Evidencias para el Colaborador
                     </button>
                  </div>

                  {/* Phase 3: Employee Signature & Selfie Receipt (Colaborador) */}
                  <div className={`space-y-6 transition-all duration-500 ${evidencePhotos.length === 0 || !giverSignature ? "opacity-30 pointer-events-none" : "opacity-100"}`}>
                     <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                           <Signature size={14} className="text-blue-500" /> 3. Firma de Conformidad & Selfie de Recepción (Colaborador)
                        </label>
                        {signatureDataUrl ? (
                           <div className="flex items-center gap-1 text-emerald-500 text-[9px] font-black uppercase">
                              <CheckCircle2 size={12} /> Firma Registrada
                           </div>
                        ) : (
                           <div className="flex items-center gap-1 text-blue-500 text-[9px] font-black uppercase animate-pulse">
                              <RefreshCw size={12} className="animate-spin" /> Esperando Firma...
                           </div>
                        )}
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-3xl p-6">
                        {/* Col 1: Smooth ink Signature */}
                        <div className="space-y-3">
                           <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Trazado de Firma Digital</h4>
                           {signatureDataUrl ? (
                              <div className="bg-white/90 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm h-48 flex items-center justify-center">
                                 <img src={signatureDataUrl} className="max-h-full max-w-full object-contain" alt="Firma Colaborador" />
                              </div>
                           ) : (
                              <div className="bg-white dark:bg-white/5 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-2 overflow-hidden relative">
                                 <canvas 
                                   ref={canvasRef} width={600} height={180}
                                   className="w-full h-44 bg-blue-50/20 rounded-xl cursor-crosshair"
                                   onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={endDrawing} onMouseLeave={endDrawing}
                                   onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={endDrawing}
                                 />
                                 <button onClick={clearSignature} className="absolute bottom-6 right-6 text-[9px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-1 hover:underline">
                                   <Eraser size={14} /> Limpiar Firma
                                 </button>
                              </div>
                           )}
                           <p className="text-[9px] text-slate-400 font-bold italic">* Firma con el mouse o pantalla táctil con trazo suavizado de alta fidelidad.</p>
                        </div>

                        {/* Col 2: Selfie Receipt Capture */}
                        <div className="space-y-3">
                           <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Selfie de Recepción (Seguridad)</h4>
                           
                           {isCameraActive ? (
                              <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden relative h-48 flex items-center justify-center">
                                 <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover scale-x-[-1]" />
                                 <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2 px-4">
                                    <button 
                                       onClick={captureSelfie}
                                       className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[9px] uppercase tracking-widest px-4 py-2 rounded-xl transition-all shadow-lg"
                                    >
                                       Tomar Foto
                                    </button>
                                    <button 
                                       onClick={stopCamera}
                                       className="bg-rose-600 hover:bg-rose-500 text-white font-black text-[9px] uppercase tracking-widest px-4 py-2 rounded-xl transition-all shadow-lg"
                                    >
                                       Cancelar
                                    </button>
                                 </div>
                              </div>
                           ) : receiverSelfie ? (
                              <div className="bg-white/95 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm h-48 flex flex-col items-center justify-center relative group">
                                 <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-blue-100 shadow-md">
                                    <img src={receiverSelfie} className="w-full h-full object-cover" alt="Selfie Colaborador" />
                                 </div>
                                 <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mt-2 flex items-center gap-1">
                                    <CheckCircle2 size={10} /> Selfie Validado
                                 </span>
                                 <button 
                                    onClick={startCamera}
                                    className="absolute top-2 right-2 w-6 h-6 bg-blue-600 text-white rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg"
                                 >
                                    <Camera size={14} />
                                 </button>
                              </div>
                           ) : (
                              <div className="border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-white/5 rounded-2xl h-48 flex flex-col items-center justify-center text-center p-4">
                                 <Camera className="text-slate-400 mb-2" size={32} />
                                 <button 
                                    onClick={startCamera}
                                    className="bg-blue-600 hover:bg-blue-500 text-white text-[9px] font-black uppercase tracking-widest px-5 py-2.5 rounded-xl transition-all shadow-md"
                                 >
                                    Activar Cámara & Tomar Selfie
                                 </button>
                                 <p className="text-[8px] text-slate-400 font-bold mt-2 max-w-[200px]">Usa la cámara web para tomar una selfie rápida como comprobante oficial de entrega.</p>
                              </div>
                           )}
                        </div>
                     </div> border border-dashed border-slate-300

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
                            const finalEvidencePhotos = receiverSelfie ? [receiverSelfie, ...evidencePhotos] : evidencePhotos;
                            const response = await onSubmitDelivery({
                              employeeFullName: employeeProfile?.fullName || "",
                              employeeDocument: employeeProfile?.document || "",
                              employeeEmail: employeeProfile?.email || "",
                              employeeCargo: employeeProfile?.cargo || "",
                              items: selectedProducts,
                              notes,
                              signatureDataUrl,
                              giverSignatureDataUrl: giverSignature,
                              giverFullName: session?.fullName || "Administrador Central",
                              evidencePhotos: finalEvidencePhotos
                            });
                           
                           if (currentSession) {
                              await api.employeeSignSession(currentSession.id.toString(), signatureDataUrl);
                           }
                           
                           const actaData = {
                             nombre: employeeProfile?.fullName || "N/A",
                             identificacion: employeeProfile?.document || "N/A",
                             cargo: employeeProfile?.cargo || "N/A",
                             nroActa: response.actaNumber || "S/N",
                             articulos: selectedProducts.map(sp => {
                                const p = products.find(prod => prod.id === sp.productId);
                                return {
                                   descripcion: p?.name || "N/A",
                                   talla: sp.talla || "N/A",
                                   cantidad: sp.quantity,
                                   imagen: ""
                                };
                             }),
                             firmaBase64: signatureDataUrl,
                             firmaGiverBase64: giverSignature,
                             nombreGiver: session?.fullName || "Administrador Central",
                             evidencias: finalEvidencePhotos
                           };
                           
                           setGeneratedActa(actaData);
                           setShowSuccessModal(true);
                           
                         } catch (e) {
                           onNotify?.("error", "Error al finalizar la entrega.");
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

      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        title="¿Remover Colaborador?"
        message="¿Está seguro que desea eliminar a este colaborador de la lista de espera? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        isDestructive={true}
        onConfirm={executeRemovePendingEmployee}
        onCancel={() => setConfirmConfig({ isOpen: false, empId: null })}
      />
    </div>
  );
};
