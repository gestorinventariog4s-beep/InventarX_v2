import React, { useState, useEffect } from 'react';
import { fetchInventoryMovements } from '../services/inventoryMovements';
import { fetchEntregas } from '../services/api';
import type { InventoryMovement, Entrega } from '../types';
import { 
  ShieldCheck, 
  Calendar, 
  User, 
  Terminal, 
  Database,
  Lock,
  Search
} from 'lucide-react';
import type { AuditLog } from '../types';

interface AuditModuleProps {
  auditLogs: AuditLog[];
  auditFrom: string;
  setAuditFrom: (v: string) => void;
  auditTo: string;
  setAuditTo: (v: string) => void;
  onRefresh: () => Promise<void>;
  isLoading: boolean;
}

const getSession = () => {
  try {
    return JSON.parse(localStorage.getItem('gestion-dotacion-auth') || 'null');
  } catch {
    return null;
  }
};
const getLogout = () => {
  return () => {
    localStorage.removeItem('gestion-dotacion-auth');
    window.location.reload();
  };
};

export const AuditModule: React.FC<AuditModuleProps> = ({
  auditLogs,
  auditFrom,
  setAuditFrom,
  auditTo,
  setAuditTo,
  onRefresh,
  isLoading
}) => {
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [entregas, setEntregas] = useState<Entrega[]>([]);
  const [search, setSearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const session = getSession();
    const onLogout = getLogout();
    if (!session) return;
    fetchInventoryMovements(session, onLogout)
      .then(setMovements)
      .catch(() => setMovements([]));
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setIsSearching(true);
      fetchEntregas(search)
        .then((res) => setEntregas(res.data))
        .catch(() => setEntregas([]))
        .finally(() => setIsSearching(false));
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [search, auditLogs]); // Re-fetch if logs change (meaning a new action happened)

  return (
    <div className="space-y-8 animate-fade pb-10">
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Banner de Seguridad - REDISEÑADO PREMIUM */}
        <div className="lg:col-span-8 bg-gradient-to-br from-blue-800 via-indigo-900 to-slate-900 dark:from-slate-950 dark:via-blue-950 dark:to-black rounded-[2.5rem] p-10 text-white relative overflow-hidden flex flex-col justify-between min-h-[350px] shadow-2xl border border-white/10">
          <div className="absolute -top-10 -right-10 opacity-5 pointer-events-none text-white blur-sm transition-transform duration-1000 hover:scale-110">
            <ShieldCheck size={350} />
          </div>
          
          <div className="relative z-10 space-y-6">
            <div className="inline-flex items-center gap-2 bg-black/20 backdrop-blur-md border border-white/10 px-5 py-2 rounded-2xl shadow-inner">
              <Lock size={14} className="text-emerald-400" />
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-100">Bóveda de Seguridad Certificada</span>
            </div>
            
            <h1 className="text-5xl md:text-6xl font-black tracking-tighter leading-tight drop-shadow-lg">
              Auditoría <br /> <span className="text-blue-400 dark:text-blue-500">Integral</span>
            </h1>
            
            <p className="text-blue-100/80 max-w-md text-sm md:text-base font-medium leading-relaxed">
              Registro inmutable y trazabilidad de extremo a extremo para todas las operaciones tácticas.
            </p>
          </div>

          <div className="relative z-10 flex gap-4 mt-8">
             <div className="bg-black/20 backdrop-blur-md border border-white/10 rounded-2xl px-6 py-4 flex items-center gap-4 shadow-lg hover:bg-black/30 transition-colors">
                <div className="bg-blue-500/20 p-2 rounded-xl">
                  <Database size={24} className="text-blue-300" />
                </div>
                <div>
                   <p className="text-2xl font-black tracking-tight">{auditLogs.length}</p>
                   <p className="text-[8px] font-black uppercase tracking-widest text-blue-200/60 mt-1">Registros Indexados</p>
                </div>
             </div>
          </div>
        </div>

        {/* Filtros de Rango - GLASSMORPHISM */}
        <div className="lg:col-span-4 bg-white/70 dark:bg-slate-900/40 backdrop-blur-2xl border border-white/40 dark:border-white/10 rounded-[2.5rem] p-8 flex flex-col justify-between shadow-xl">
          <div className="space-y-8">
            <div>
              <p className="text-[10px] font-black text-blue-600 dark:text-slate-400 uppercase tracking-[0.2em] mb-5">Parámetros de Consulta</p>
              
              <div className="space-y-4">
                <div className="relative group">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500 transition-colors group-hover:text-blue-600" size={18} />
                  <input 
                    type="date" 
                    className="w-full bg-blue-50/60 dark:bg-black/20 border-none rounded-2xl py-4 pl-14 pr-4 text-sm font-black text-blue-950 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/30 transition-all shadow-inner"
                    value={auditFrom} onChange={(e) => setAuditFrom(e.target.value)}
                  />
                </div>
                <div className="relative group">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500 transition-colors group-hover:text-blue-600" size={18} />
                  <input 
                    type="date" 
                    className="w-full bg-blue-50/60 dark:bg-black/20 border-none rounded-2xl py-4 pl-14 pr-4 text-sm font-black text-blue-950 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/30 transition-all shadow-inner"
                    value={auditTo} onChange={(e) => setAuditTo(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <button 
              className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all shadow-lg hover:shadow-blue-500/25 active:scale-95 disabled:opacity-50"
              onClick={onRefresh} disabled={isLoading}
            >
              <Search size={18} /> Sincronizar Bóveda
            </button>

            <div className="mt-4 pt-6 border-t border-blue-100/50 dark:border-white/10">
              <p className="text-[10px] font-black text-blue-600 dark:text-slate-400 uppercase tracking-[0.2em] mb-4">Buscador de Entregas</p>
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500" size={18} />
                <input 
                  type="text" 
                  placeholder="Nombre o Documento..."
                  className="w-full bg-blue-50/60 dark:bg-black/20 border-none rounded-2xl py-4 pl-14 pr-4 text-sm font-black text-blue-950 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/30 transition-all shadow-inner"
                  value={search} onChange={(e) => setSearch(e.target.value)}
                />
                {isSearching && <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] text-blue-500 animate-pulse font-black uppercase tracking-wider">Buscando...</span>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de Entregas Tácticas - REDISEÑADA */}
      <div className="bg-white/70 dark:bg-slate-900/40 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-[2.5rem] shadow-xl overflow-hidden mb-8">
        <div className="p-8 border-b border-blue-50 dark:border-white/5 bg-gradient-to-r from-blue-50/50 to-transparent dark:from-black/20 flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-4 bg-white dark:bg-slate-800 p-3 rounded-2xl shadow-sm border border-blue-100 dark:border-white/5">
            <ShieldCheck size={20} className="text-blue-600 dark:text-blue-400" />
            <span className="text-[10px] font-black text-blue-950 dark:text-slate-200 uppercase tracking-[0.2em]">Registro de Entregas Tácticas</span>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-transparent">
                <th className="px-8 py-6 text-[10px] font-black text-blue-400 dark:text-slate-500 uppercase tracking-[0.2em] border-b border-blue-100/50 dark:border-white/5">ID Evento</th>
                <th className="px-8 py-6 text-[10px] font-black text-blue-400 dark:text-slate-500 uppercase tracking-[0.2em] border-b border-blue-100/50 dark:border-white/5">Operador</th>
                <th className="px-8 py-6 text-[10px] font-black text-blue-400 dark:text-slate-500 uppercase tracking-[0.2em] border-b border-blue-100/50 dark:border-white/5">Receptor</th>
                <th className="px-8 py-6 text-[10px] font-black text-blue-400 dark:text-slate-500 uppercase tracking-[0.2em] border-b border-blue-100/50 dark:border-white/5">Artículos</th>
                <th className="px-8 py-6 text-[10px] font-black text-blue-400 dark:text-slate-500 uppercase tracking-[0.2em] border-b border-blue-100/50 dark:border-white/5 text-right">Acta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-50/50 dark:divide-white/5">
              {entregas.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-[10px] font-black text-blue-300 dark:text-slate-600 uppercase tracking-widest bg-white/30 dark:bg-transparent">No hay entregas registradas en este periodo</td>
                </tr>
              ) : (
                entregas.map((entrega) => (
                  <tr key={entrega.id} className="hover:bg-white/60 dark:hover:bg-white/5 transition-all group text-xs">
                    <td className="px-8 py-6">
                      <code className="text-[11px] font-black text-blue-700 dark:text-blue-400 bg-blue-100/50 dark:bg-blue-500/10 px-3 py-1.5 rounded-xl border border-blue-200/50 dark:border-blue-500/20">{entrega.idUnicoRastreo}</code>
                      <p className="text-[10px] mt-2 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">{new Date(entrega.creadoEn).toLocaleString()}</p>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-50 dark:bg-slate-800 p-2 rounded-full border border-blue-100 dark:border-white/5">
                          <User size={14} className="text-blue-500 dark:text-blue-400" />
                        </div>
                        <span className="font-black text-blue-950 dark:text-slate-200 text-sm tracking-tight">
                          {entrega.operador?.perfil?.nombreCompleto || entrega.operador?.correo || 'Desconocido'}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="font-black text-blue-950 dark:text-white block text-sm tracking-tight">{entrega.receptor?.nombreCompleto}</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block tracking-[0.1em] font-bold uppercase">ID: {entrega.receptor?.documentoIdentidad}</span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-wrap gap-2">
                        {entrega.inventarioItems.map((item, idx) => (
                          <span key={idx} className="bg-slate-100 dark:bg-white/10 px-3 py-1.5 rounded-lg text-[10px] font-black text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/5">
                            {item.cantidad}x PROD-{item.productoId}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      {(entrega.urlActaPdf || entrega.urlEvidencia) ? (
                        <a 
                          href={entrega.urlActaPdf || entrega.urlEvidencia}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex bg-emerald-100/50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-200/50 dark:hover:bg-emerald-500/20 transition-all border border-emerald-200/50 dark:border-emerald-500/20 hover:scale-105 active:scale-95"
                        >
                          Ver Acta
                        </a>
                      ) : (
                        <span className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-black bg-slate-50 dark:bg-slate-800 px-4 py-2 rounded-xl border border-slate-200 dark:border-white/5">Sin Acta</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tabla de Eventos Generales - REDISEÑADA */}
      <div className="bg-white/70 dark:bg-slate-900/40 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-[2.5rem] shadow-xl overflow-hidden mb-8">
        <div className="p-8 border-b border-blue-50 dark:border-white/5 bg-gradient-to-r from-blue-50/50 to-transparent dark:from-black/20 flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-4 bg-white dark:bg-slate-800 p-3 rounded-2xl shadow-sm border border-blue-100 dark:border-white/5">
            <Terminal size={20} className="text-blue-600 dark:text-blue-400" />
            <span className="text-[10px] font-black text-blue-950 dark:text-slate-200 uppercase tracking-[0.2em]">Registro de Eventos Globales</span>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-transparent">
                <th className="px-8 py-6 text-[10px] font-black text-blue-400 dark:text-slate-500 uppercase tracking-[0.2em] border-b border-blue-100/50 dark:border-white/5">Timestamp</th>
                <th className="px-8 py-6 text-[10px] font-black text-blue-400 dark:text-slate-500 uppercase tracking-[0.2em] border-b border-blue-100/50 dark:border-white/5">Usuario</th>
                <th className="px-8 py-6 text-[10px] font-black text-blue-400 dark:text-slate-500 uppercase tracking-[0.2em] border-b border-blue-100/50 dark:border-white/5">Acción</th>
                <th className="px-8 py-6 text-[10px] font-black text-blue-400 dark:text-slate-500 uppercase tracking-[0.2em] border-b border-blue-100/50 dark:border-white/5 text-right">ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-50/50 dark:divide-white/5">
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-16 text-center text-[10px] font-black text-blue-300 dark:text-slate-600 uppercase tracking-widest bg-white/30 dark:bg-transparent">No se han detectado eventos</td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/60 dark:hover:bg-white/5 transition-colors group text-[11px]">
                    <td className="px-8 py-6">
                      <p className="font-bold text-slate-600 dark:text-slate-300 tracking-wider uppercase text-[10px]">{new Date(log.createdAt).toLocaleString()}</p>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-full border border-slate-200 dark:border-white/5">
                          <User size={12} className="text-slate-500 dark:text-slate-400" />
                        </div>
                        <span className="font-black text-blue-950 dark:text-slate-200">{log.actorUsername}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="font-black text-blue-900 dark:text-white tracking-tight text-sm bg-blue-50 dark:bg-white/5 px-3 py-1.5 rounded-lg border border-blue-100 dark:border-white/10">{log.action}</span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <code className="text-[10px] font-black text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/5">#{log.id}</code>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Historial de Movimientos - REDISEÑADO */}
      <div className="bg-white/70 dark:bg-slate-900/40 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-[2.5rem] p-8 shadow-xl">
        <h2 className="text-2xl font-black mb-8 text-blue-950 dark:text-white tracking-tight flex items-center gap-3">
          <Database size={24} className="text-blue-500" />
          Historial de Movimientos Internos
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="text-left">
                <th className="px-6 py-4 text-[10px] font-black text-blue-400 dark:text-slate-500 uppercase tracking-[0.2em] border-b border-blue-100/50 dark:border-white/5">Fecha</th>
                <th className="px-6 py-4 text-[10px] font-black text-blue-400 dark:text-slate-500 uppercase tracking-[0.2em] border-b border-blue-100/50 dark:border-white/5">Producto</th>
                <th className="px-6 py-4 text-[10px] font-black text-blue-400 dark:text-slate-500 uppercase tracking-[0.2em] border-b border-blue-100/50 dark:border-white/5">Cantidad</th>
                <th className="px-6 py-4 text-[10px] font-black text-blue-400 dark:text-slate-500 uppercase tracking-[0.2em] border-b border-blue-100/50 dark:border-white/5">Tipo</th>
                <th className="px-6 py-4 text-[10px] font-black text-blue-400 dark:text-slate-500 uppercase tracking-[0.2em] border-b border-blue-100/50 dark:border-white/5">Responsable</th>
                <th className="px-6 py-4 text-[10px] font-black text-blue-400 dark:text-slate-500 uppercase tracking-[0.2em] border-b border-blue-100/50 dark:border-white/5">Motivo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-50/50 dark:divide-white/5">
              {movements.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">No hay movimientos registrados.</td></tr>
              ) : (
                movements.map(mov => (
                  <tr key={mov.id} className="hover:bg-white/60 dark:hover:bg-white/5 transition-colors text-[11px] font-black text-blue-950 dark:text-slate-200">
                    <td className="px-6 py-5 whitespace-nowrap text-slate-500 dark:text-slate-400 tracking-wider font-bold uppercase">{new Date(mov.createdAt).toLocaleString()}</td>
                    <td className="px-6 py-5 text-sm tracking-tight">{mov.product?.name || '-'}</td>
                    <td className="px-6 py-5 text-sm">{mov.quantity} <span className="text-[9px] text-blue-400 uppercase tracking-widest ml-1">UN</span></td>
                    <td className="px-6 py-5">
                       <span className={`px-3 py-1.5 rounded-lg text-[9px] uppercase tracking-[0.15em] border ${mov.movementType === 'INBOUND' || mov.movementType === 'ENTRADA' ? 'bg-emerald-50 text-emerald-600 border-emerald-200/50 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 border-rose-200/50 dark:bg-rose-500/10 dark:border-rose-500/20 dark:text-rose-400'}`}>
                         {mov.movementType}
                       </span>
                    </td>
                    <td className="px-6 py-5">{mov.createdBy}</td>
                    <td className="px-6 py-5 opacity-70 font-medium">{mov.reason}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
