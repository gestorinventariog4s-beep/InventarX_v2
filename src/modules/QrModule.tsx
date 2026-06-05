import React, { useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  QrCode, 
  PenLine,
  RefreshCw,
  ShieldCheck, 
  FileCheck,
  Eraser,
  UserCheck,
  Share2,
  Lock,
} from 'lucide-react';
import { Product } from '../types';
import { downloadLocalActaPDF } from '../services/pdfGeneratorService';

interface QrModuleProps {
  products: Product[];
  onConfirmReception: (payload: {
    qrToken: string;
    employeeFullName: string;
    employeeDocument: string;
    employeeEmail: string;
    employeeCargo: string;
    notes: string;
    items: Array<{ productId: string; quantity: number }>;
    signatureDataUrl: string;
  }) => Promise<{ actaId: number; actaNumber: string; employeeEmail: string }>;
  onManualActa?: (payload: {
    type: 'ENTRADA' | 'SALIDA';
    personFullName: string;
    personDocument: string;
    employeeEmail: string;
    personCargo: string;
    notes: string;
    items: Array<{ productId: string; quantity: number }>;
    signatureDataUrl: string;
  }) => Promise<{ actaId: number; actaNumber: string; employeeEmail: string }>;
  onDownloadActa: (actaId: number) => Promise<void>;
  isLoading: boolean;
}

export const QrModule: React.FC<QrModuleProps> = ({
  products,
  onConfirmReception,
  onManualActa,
  onDownloadActa,
  isLoading
}) => {
  const QR_STORAGE_KEY = 'invetarx-corporate-qr-token';

  const createCorporateToken = () => {
    const randomPart = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8).toUpperCase()
      : Math.random().toString(36).slice(2, 10).toUpperCase();
    return `INVETARX-RX-${randomPart}`;
  };

  const ensureCorporateToken = () => {
    if (typeof window === 'undefined') {
      return '';
    }

    const existing = localStorage.getItem(QR_STORAGE_KEY);
    if (existing) {
      return existing;
    }

    const created = createCorporateToken();
    localStorage.setItem(QR_STORAGE_KEY, created);
    return created;
  };

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const [qrToken, setQrToken] = useState<string>(() => ensureCorporateToken());
  const [employeeFullName, setEmployeeFullName] = useState('');
  const [employeeDocument, setEmployeeDocument] = useState('');
  const [employeeEmail, setEmployeeEmail] = useState('');
  const [employeeCargo, setEmployeeCargo] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});
  const [signatureDataUrl, setSignatureDataUrl] = useState('');
  const [result, setResult] = useState<{ actaId: number; actaNumber: string; employeeEmail: string } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedQr, setGeneratedQr] = useState<string>(() => ensureCorporateToken());
  const [operationMode, setOperationMode] = useState<'QR' | 'MANUAL_ENTRADA' | 'MANUAL_SALIDA'>('QR');

  const getReceptionUrl = (token: string) => {
    if (typeof window === 'undefined') {
      return '';
    }

    const baseUrl = window.location.href.split('#')[0];
    return `${baseUrl}#/recepcion-dotacion?token=${encodeURIComponent(token)}`;
  };

  const receptionUrl = getReceptionUrl(generatedQr || qrToken);

  const selectedProducts = useMemo(() => {
    return Object.entries(selectedItems)
      .filter(([, quantity]) => quantity > 0)
      .map(([productId, quantity]) => ({ productId, quantity }));
  }, [selectedItems]);

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    if (dataUrl.length > 2000) {
      setSignatureDataUrl(dataUrl);
    }
  };

  const getCanvasPoint = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const isTouchEvent = 'touches' in event;
    const clientX = isTouchEvent ? event.touches[0].clientX : event.clientX;
    const clientY = isTouchEvent ? event.touches[0].clientY : event.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDrawing = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    const { x, y } = getCanvasPoint(event);
    context.beginPath();
    context.moveTo(x, y);
    drawingRef.current = true;
  };

  const draw = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    const { x, y } = getCanvasPoint(event);
    context.lineTo(x, y);
    context.strokeStyle = '#2563eb';
    context.lineWidth = 3;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.stroke();
  };

  const endDrawing = () => {
    drawingRef.current = false;
    saveSignature();
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureDataUrl('');
  };

  const handleGenerateGeneralQr = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const created = createCorporateToken();
      localStorage.setItem(QR_STORAGE_KEY, created);
      setGeneratedQr(created);
      setQrToken(created);
      setIsGenerating(false);
    }, 1500);
  };

  const handleShareAccess = async () => {
    if (!receptionUrl) {
      return;
    }

    if (navigator.share) {
      await navigator.share({
        title: 'Recepción de dotación Invetarx',
        text: 'Abra este enlace para confirmar la recepción de la dotación.',
        url: receptionUrl,
      });
      return;
    }

    await navigator.clipboard.writeText(receptionUrl);
  };

  const handleSubmit = async () => {
    if (!employeeFullName.trim() || !employeeDocument.trim() || !employeeEmail.trim() || !employeeCargo.trim()) return;
    if (selectedProducts.length === 0 || !signatureDataUrl) return;

    if (operationMode === 'QR') {
      const tokenToUse = qrToken.trim() || generatedQr;
      if (!tokenToUse) return;
      const response = await onConfirmReception({
        qrToken: tokenToUse,
        employeeFullName: employeeFullName.trim(),
        employeeDocument: employeeDocument.trim(),
        employeeEmail: employeeEmail.trim(),
        employeeCargo: employeeCargo.trim(),
        notes: notes.trim(),
        items: selectedProducts,
        signatureDataUrl,
      });
      setResult(response);
    } else if (onManualActa) {
      const response = await onManualActa({
        type: operationMode === 'MANUAL_ENTRADA' ? 'ENTRADA' : 'SALIDA',
        personFullName: employeeFullName.trim(),
        personDocument: employeeDocument.trim(),
        employeeEmail: employeeEmail.trim(),
        personCargo: employeeCargo.trim(),
        notes: notes.trim(),
        items: selectedProducts,
        signatureDataUrl,
      });
      setResult(response);
    }
  };

  return (
    <div className="space-y-6 animate-fade pb-10">
      
      {/* Header Section - UNIFIED 8/4 BENTO STYLE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Banner de QR */}
        <div className="lg:col-span-8 bg-blue-600 dark:bg-black/40 rounded-[2.5rem] p-8 text-white relative overflow-hidden flex flex-col justify-between min-h-[350px] shadow-xl border border-blue-500 dark:border-white/5">
          <div className="absolute -top-10 -right-10 opacity-10 pointer-events-none text-white">
            <QrCode size={300} />
          </div>
          
          <div className="relative z-10 space-y-4">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 px-4 py-1.5 rounded-xl">
              <Lock size={14} className="text-emerald-400" />
              <span className="text-[9px] font-black uppercase tracking-[0.2em]">Cifrado de Alta Seguridad</span>
            </div>
            
            <h1 className="text-5xl font-black tracking-tighter leading-none">
              Ecosistema <br /> <span className="text-blue-100 dark:text-blue-400">QR Inteligente</span>
            </h1>
            
            <p className="text-blue-50 max-w-md text-sm font-medium leading-relaxed opacity-80">
              Generación y recepción de tokens corporativos para la trazabilidad inmutable de suministros.
            </p>
          </div>

          <div className="relative z-10 flex gap-3 mt-6">
             <button 
               onClick={handleGenerateGeneralQr}
               className="bg-white text-blue-700 hover:bg-blue-50 px-8 py-4 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all shadow-md active:scale-95"
             >
               {isGenerating ? <RefreshCw className="animate-spin" size={16} /> : <QrCode size={16} />} 
               Regenerar QR Corporativo
             </button>
             <button onClick={() => void handleShareAccess()} className="bg-blue-800/40 hover:bg-blue-800/60 backdrop-blur-md text-white px-8 py-4 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all border border-white/10">
               <Share2 size={16} /> Compartir Acceso
             </button>
          </div>
        </div>

        {/* Generador (Isla Derecha) */}
        <div className="lg:col-span-4 bg-white dark:bg-white/5 border border-blue-100 dark:border-white/10 rounded-[2.5rem] p-8 flex flex-col justify-center items-center shadow-sm relative overflow-hidden text-center">
           <AnimatePresence mode="wait">
             {generatedQr ? (
               <motion.div key="qr" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
                  <div className="w-32 h-32 bg-white p-3 rounded-2xl border border-blue-100 shadow-xl mx-auto flex items-center justify-center">
                     <img src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(receptionUrl)}`} alt="QR de recepcion" className="w-full h-full rounded-xl" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest">URL activa de recepción</p>
                    <p className="text-[11px] font-black text-blue-900 dark:text-white mt-1 break-all">{receptionUrl}</p>
                  </div>
                  <button
                    onClick={() => {
                      localStorage.removeItem(QR_STORAGE_KEY);
                      setGeneratedQr('');
                      setQrToken('');
                    }}
                    className="text-[9px] font-black text-rose-500 uppercase tracking-widest hover:underline"
                  >
                    Revocar Acceso
                  </button>
               </motion.div>
             ) : (
               <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  <div className="w-20 h-20 rounded-full bg-blue-50 dark:bg-white/5 flex items-center justify-center mx-auto text-blue-200">
                    <Lock size={32} />
                  </div>
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] max-w-[180px]">Haga clic en el botón para generar una llave de acceso temporal</p>
               </motion.div>
             )}
           </AnimatePresence>
        </div>
      </div>

      {/* Main Reception Form - REDESIGNED */}
      <div className="bg-white dark:bg-white/5 border border-blue-100 dark:border-white/10 rounded-[2.5rem] p-8 shadow-sm">
        <div className="flex items-center gap-4 mb-6 border-b border-blue-50 dark:border-white/5 pb-6">
           <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg"><UserCheck size={20} /></div>
           <div>
              <h3 className="text-xl font-black text-blue-900 dark:text-white tracking-tighter">
                {operationMode === 'QR' ? 'Recepción de Suministros (Vía QR)' : operationMode === 'MANUAL_ENTRADA' ? 'Acta Manual: Recepción de Inventario' : 'Acta Manual: Entrega de Suministros'}
              </h3>
              <p className="text-[10px] font-black text-blue-400 dark:text-slate-500 uppercase tracking-widest">Protocolo de Validación y Firma</p>
           </div>
        </div>

        <div className="flex flex-wrap gap-3 mb-8">
          <button onClick={() => setOperationMode('QR')} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${operationMode === 'QR' ? 'bg-blue-600 text-white shadow-md' : 'bg-blue-50 text-blue-600 dark:bg-white/5 dark:text-slate-300'}`}>Protocolo QR</button>
          <button onClick={() => setOperationMode('MANUAL_ENTRADA')} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${operationMode === 'MANUAL_ENTRADA' ? 'bg-emerald-600 text-white shadow-md' : 'bg-emerald-50 text-emerald-700 dark:bg-white/5 dark:text-slate-300'}`}>Acta Manual: Ingreso</button>
          <button onClick={() => setOperationMode('MANUAL_SALIDA')} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${operationMode === 'MANUAL_SALIDA' ? 'bg-indigo-600 text-white shadow-md' : 'bg-indigo-50 text-indigo-700 dark:bg-white/5 dark:text-slate-300'}`}>Acta Manual: Salida</button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {operationMode === 'QR' && (
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-blue-500">Token QR</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-600" size={14} />
                    <input value={qrToken} onChange={e => setQrToken(e.target.value)} className="w-full bg-blue-50/50 dark:bg-white/5 border-none rounded-xl py-4 pl-10 pr-4 text-xs font-black text-blue-900 dark:text-white outline-none" placeholder="Token corporativo activo" />
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-blue-500">
                  {operationMode === 'MANUAL_ENTRADA' ? 'Nombre Proveedor/Emisor' : 'Nombre Operario/Receptor'}
                </label>
                <div className="relative">
                  <UserCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-600" size={14} />
                  <input value={employeeFullName} onChange={e => setEmployeeFullName(e.target.value)} className="w-full bg-blue-50/50 dark:bg-white/5 border-none rounded-xl py-4 pl-10 pr-4 text-xs font-black text-blue-900 dark:text-white outline-none" placeholder="Nombre completo..." />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-blue-500">Identificación</label>
                <input value={employeeDocument} onChange={e => setEmployeeDocument(e.target.value)} className="w-full bg-blue-50/50 dark:bg-white/5 border-none rounded-xl py-4 px-4 text-xs font-black text-blue-900 dark:text-white outline-none" placeholder="CC / DNI..." />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-blue-500">Cargo / Área</label>
                <input value={employeeCargo} onChange={e => setEmployeeCargo(e.target.value)} className="w-full bg-blue-50/50 dark:bg-white/5 border-none rounded-xl py-4 px-4 text-xs font-black text-blue-900 dark:text-white outline-none" placeholder="Ej: Operario de Planta" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-widest text-blue-500">Email Corporativo</label>
              <input value={employeeEmail} onChange={e => setEmployeeEmail(e.target.value)} className="w-full bg-blue-50/50 dark:bg-white/5 border-none rounded-xl py-4 px-4 text-xs font-black text-blue-900 dark:text-white outline-none" placeholder="empleado@empresa.com" />
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-widest text-blue-500">Notas de Auditoría</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full bg-blue-50/50 dark:bg-white/5 border-none rounded-xl py-4 px-4 text-xs font-black text-blue-900 dark:text-white outline-none min-h-[80px]" placeholder="Observaciones adicionales..." />
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-widest text-blue-500">
                {operationMode === 'MANUAL_ENTRADA' ? 'Ítems a Ingresar' : 'Ítems a Entregar'}
              </label>
              <div className="max-h-[160px] overflow-auto border border-blue-50 dark:border-white/5 rounded-xl bg-blue-50/20 p-2 space-y-1">
                {products.map(p => (
                  <div key={p.id} className="flex items-center gap-3 p-2 bg-white dark:bg-white/5 rounded-lg border border-blue-50 dark:border-white/5">
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black text-blue-900 dark:text-white truncate">{p.name}</p>
                    </div>
                    <input type="number" min={0} value={selectedItems[p.id] || 0} onChange={e => setSelectedItems({...selectedItems, [p.id]: Number(e.target.value)})} className="w-14 bg-blue-50 dark:bg-white/5 border-none rounded-lg p-1.5 text-[10px] font-black text-center" />
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-widest text-blue-500">Firma de Conformidad</label>
              <div className="border border-blue-100 dark:border-white/10 rounded-2xl bg-white dark:bg-white/5 p-2 overflow-hidden">
                <canvas 
                  ref={canvasRef} width={500} height={150} className="w-full h-28 rounded-xl bg-blue-50/30 border border-dashed border-blue-200"
                  onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={endDrawing} onMouseLeave={endDrawing}
                  onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={endDrawing}
                />
                <div className="mt-2 flex justify-between items-center px-2">
                   <button onClick={clearSignature} className="text-[8px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-1"><Eraser size={12} /> Limpiar Firma</button>
                   <p className="text-[8px] font-black text-emerald-600 uppercase flex items-center gap-1">{signatureDataUrl ? <FileCheck size={12} /> : <PenLine size={12} />} {signatureDataUrl ? 'Capturada' : 'Pendiente'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <button 
          onClick={handleSubmit} disabled={isLoading || !signatureDataUrl || (operationMode === 'QR' && !(qrToken.trim() || generatedQr))}
          className={`w-full text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-xl mt-8 active:scale-95 disabled:opacity-50 ${operationMode === 'QR' ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20' : operationMode === 'MANUAL_ENTRADA' ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20' : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20'}`}
        >
          {isLoading ? <RefreshCw className="animate-spin" /> : <><ShieldCheck size={18} /> Confirmar & Generar Acta</>}
        </button>

        {result && (
           <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 p-5 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-2xl flex justify-between items-center">
              <div>
                <p className="text-xs font-black text-emerald-700">Acta #{result.actaNumber} Generada</p>
                <p className="text-[9px] font-bold text-emerald-600 uppercase mt-1">Soporte registrado y correo enviado a: {result.employeeEmail}</p>
              </div>
              <button onClick={async () => {
                if (operationMode !== 'QR') {
                  const btn = document.getElementById(`btn-acta-download-qr`);
                  if (btn) btn.innerText = 'GENERANDO...';
                  await downloadLocalActaPDF({
                    nombre: employeeFullName.trim(),
                    identificacion: employeeDocument.trim(),
                    cargo: employeeCargo.trim() || 'N/A',
                    articulos: selectedProducts.map(sp => {
                      const p = products.find(prod => prod.id === sp.productId);
                      return {
                        imagen: 'https://placehold.co/400x400/png',
                        descripcion: p?.name || `PROD-${sp.productId.substring(0, 8)}`,
                        talla: 'N/A',
                        cantidad: sp.quantity
                      };
                    }),
                    firmaBase64: signatureDataUrl,
                    nroActa: result.actaNumber
                  }, `Acta_${operationMode}_${result.actaNumber}.pdf`);
                  if (btn) btn.innerText = 'DESCARGAR PDF';
                } else {
                  await onDownloadActa(result.actaId);
                }
              }} id="btn-acta-download-qr" className="bg-white dark:bg-emerald-600 text-emerald-700 dark:text-white px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-sm border border-emerald-100">Descargar PDF</button>
           </motion.div>
        )}

        {operationMode === 'QR' && (
          <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/50 dark:bg-white/5 dark:border-white/10 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-2">Destino del QR</p>
            <p className="text-xs font-bold break-all text-blue-900 dark:text-slate-200">{receptionUrl}</p>
          </div>
        )}
      </div>
    </div>
  );
};
