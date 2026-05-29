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
    <div className="space-y-6 animate-fade pb-10">
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Banner de Seguridad - AJUSTE DE TAMAÑO */}
        <div className="lg:col-span-8 bg-blue-700 dark:bg-black/40 rounded-[2.5rem] p-8 text-white relative overflow-hidden flex flex-col justify-between min-h-[350px] shadow-xl border border-blue-600 dark:border-white/5">
          <div className="absolute -top-10 -right-10 opacity-10 pointer-events-none text-white">
            <ShieldCheck size={300} />
          </div>
          
          <div className="relative z-10 space-y-4">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 px-4 py-1.5 rounded-xl">
              <Lock size={14} className="text-emerald-400" />
              <span className="text-[9px] font-black uppercase tracking-[0.2em]">Bóveda de Seguridad Certificada</span>
            </div>
            
            <h1 className="text-5xl font-black tracking-tighter leading-none">
              Auditoría <br /> <span className="text-blue-100 dark:text-blue-400">Integral</span>
            </h1>
            
            <p className="text-blue-50 max-w-md text-sm font-medium leading-relaxed opacity-80">
              Registro inmutable y trazabilidad de extremo a extremo para todas las operaciones tácticas.
            </p>
          </div>

          <div className="relative z-10 flex gap-4 mt-6">
             <div className="bg-white/10 border border-white/20 rounded-2xl px-5 py-3 flex items-center gap-3">
                <Database size={20} className="text-white" />
                <div>
                   <p className="text-xl font-black">{auditLogs.length}</p>
                   <p className="text-[7px] font-black uppercase tracking-widest opacity-60">Registros Indexados</p>
                </div>
             </div>
          </div>
        </div>

        {/* Filtros de Rango */}
        <div className="lg:col-span-4 bg-white dark:bg-white/5 border border-blue-100 dark:border-white/10 rounded-[2.5rem] p-8 flex flex-col justify-between shadow-sm">
          <div className="space-y-6">
            <div>
              <p className="text-[9px] font-black text-blue-500 dark:text-slate-400 uppercase tracking-[0.2em] mb-4">Parámetros de Consulta</p>
              
              <div className="space-y-3">
                <div className="relative group">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-600" size={16} />
                  <input 
                    type="date" 
                    className="w-full bg-blue-50/50 dark:bg-white/5 border-none rounded-xl py-4 pl-12 pr-4 text-xs font-black text-blue-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20"
                    value={auditFrom} onChange={(e) => setAuditFrom(e.target.value)}
                  />
                </div>
                <div className="relative group">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-600" size={16} />
                  <input 
                    type="date" 
                    className="w-full bg-blue-50/50 dark:bg-white/5 border-none rounded-xl py-4 pl-12 pr-4 text-xs font-black text-blue-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20"
                    value={auditTo} onChange={(e) => setAuditTo(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <button 
              className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-50 mt-4"
              onClick={onRefresh} disabled={isLoading}
            >
              <Search size={16} /> Sincronizar Bóveda
            </button>

            <div className="mt-4 pt-4 border-t border-blue-50 dark:border-white/10">
              <p className="text-[9px] font-black text-blue-500 dark:text-slate-400 uppercase tracking-[0.2em] mb-4">Buscador de Entregas</p>
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-600" size={16} />
                <input 
                  type="text" 
                  placeholder="Nombre o Documento del receptor..."
                  className="w-full bg-blue-50/50 dark:bg-white/5 border-none rounded-xl py-4 pl-12 pr-4 text-xs font-black text-blue-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20"
                  value={search} onChange={(e) => setSearch(e.target.value)}
                />
                {isSearching && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] text-blue-400 animate-pulse font-black uppercase">Buscando...</span>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de Entregas Tácticas */}
      <div className="bg-white dark:bg-white/5 border border-blue-100 dark:border-white/10 rounded-[2.5rem] shadow-sm overflow-hidden mb-8">
        <div className="p-6 border-b border-blue-50 dark:border-white/5 bg-blue-50/20 dark:bg-black/20 flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-3">
            <ShieldCheck size={18} className="text-blue-600" />
            <span className="text-[9px] font-black text-blue-900 dark:text-slate-400 uppercase tracking-[0.2em]">Registro de Entregas Tácticas</span>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-blue-50/30 dark:bg-transparent">
                <th className="px-6 py-4 text-[9px] font-black text-blue-400 dark:text-slate-500 uppercase tracking-widest border-b border-blue-50 dark:border-white/5">ID Evento</th>
                <th className="px-6 py-4 text-[9px] font-black text-blue-400 dark:text-slate-500 uppercase tracking-widest border-b border-blue-50 dark:border-white/5">Operador</th>
                <th className="px-6 py-4 text-[9px] font-black text-blue-400 dark:text-slate-500 uppercase tracking-widest border-b border-blue-50 dark:border-white/5">Receptor</th>
                <th className="px-6 py-4 text-[9px] font-black text-blue-400 dark:text-slate-500 uppercase tracking-widest border-b border-blue-50 dark:border-white/5">Artículos</th>
                <th className="px-6 py-4 text-[9px] font-black text-blue-400 dark:text-slate-500 uppercase tracking-widest border-b border-blue-50 dark:border-white/5 text-right">Acta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-50 dark:divide-white/5">
              {entregas.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[9px] font-black text-blue-300 uppercase tracking-widest">No hay entregas registradas</td>
                </tr>
              ) : (
                entregas.map((entrega) => (
                  <tr key={entrega.id} className="hover:bg-blue-50/30 dark:hover:bg-white/5 transition-colors group text-[11px]">
                    <td className="px-6 py-4">
                      <code className="text-[10px] font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2.5 py-1 rounded-lg">{entrega.idUnicoRastreo}</code>
                      <p className="text-[9px] mt-1.5 opacity-60 font-medium">{new Date(entrega.creadoEn).toLocaleString()}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <User size={12} className="text-blue-400" />
                        <span className="font-black text-blue-900 dark:text-slate-300">
                          {entrega.operador?.perfil?.nombreCompleto || entrega.operador?.correo || 'Desconocido'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-black text-blue-900 dark:text-white block">{entrega.receptor?.nombreCompleto}</span>
                      <span className="text-[9px] opacity-70 mt-1 block tracking-wider uppercase">{entrega.receptor?.documentoIdentidad}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {entrega.inventarioItems.map((item, idx) => (
                          <span key={idx} className="bg-slate-100 dark:bg-white/10 px-2 py-0.5 rounded text-[9px] font-black">
                            {item.cantidad}x Prod-{item.productoId}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {(entrega.urlActaPdf || entrega.urlEvidencia) ? (
                        <a 
                          href={entrega.urlActaPdf || entrega.urlEvidencia}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider hover:bg-emerald-100 transition-colors"
                        >
                          Ver Acta
                        </a>
                      ) : (
                        <span className="text-[9px] opacity-50 uppercase tracking-widest font-black">Sin Acta</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tabla de Eventos */}
      <div className="bg-white dark:bg-white/5 border border-blue-100 dark:border-white/10 rounded-[2.5rem] shadow-sm overflow-hidden">
        <div className="p-6 border-b border-blue-50 dark:border-white/5 bg-blue-50/20 dark:bg-black/20 flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-3">
            <Terminal size={18} className="text-blue-600" />
            <span className="text-[9px] font-black text-blue-900 dark:text-slate-400 uppercase tracking-[0.2em]">Registro de Eventos</span>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-blue-50/30 dark:bg-transparent">
                <th className="px-6 py-4 text-[9px] font-black text-blue-400 dark:text-slate-500 uppercase tracking-widest border-b border-blue-50 dark:border-white/5">Timestamp</th>
                <th className="px-6 py-4 text-[9px] font-black text-blue-400 dark:text-slate-500 uppercase tracking-widest border-b border-blue-50 dark:border-white/5">Usuario</th>
                <th className="px-6 py-4 text-[9px] font-black text-blue-400 dark:text-slate-500 uppercase tracking-widest border-b border-blue-50 dark:border-white/5">Acción</th>
                <th className="px-6 py-4 text-[9px] font-black text-blue-400 dark:text-slate-500 uppercase tracking-widest border-b border-blue-50 dark:border-white/5 text-right">ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-50 dark:divide-white/5">
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-[9px] font-black text-blue-300 uppercase tracking-widest">No se han detectado eventos</td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-blue-50/30 dark:hover:bg-white/5 transition-colors group text-[11px]">
                    <td className="px-6 py-4">
                      <p className="font-black text-blue-950 dark:text-white">{new Date(log.createdAt).toLocaleString()}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <User size={12} className="text-blue-400" />
                        <span className="font-black text-blue-900 dark:text-slate-300">{log.actorUsername}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-black text-blue-900 dark:text-white uppercase tracking-tight">{log.action}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <code className="text-[9px] font-black text-blue-300 dark:text-slate-600 bg-blue-50/50 dark:bg-white/5 px-2 py-0.5 rounded-lg">#{log.id}</code>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Historial de Movimientos */}
      <div className="bg-white dark:bg-slate-900 border border-blue-100 dark:border-white/10 rounded-2xl p-6 shadow">
        <h2 className="text-xl font-black mb-4 text-blue-700 dark:text-blue-200">Historial de Movimientos</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs md:text-sm">
            <thead>
              <tr className="bg-blue-50 dark:bg-slate-800 text-left">
                <th className="px-3 py-2 text-[9px] font-black text-blue-400 dark:text-slate-500 uppercase tracking-widest">Fecha</th>
                <th className="px-3 py-2 text-[9px] font-black text-blue-400 dark:text-slate-500 uppercase tracking-widest">Producto</th>
                <th className="px-3 py-2 text-[9px] font-black text-blue-400 dark:text-slate-500 uppercase tracking-widest">Cantidad</th>
                <th className="px-3 py-2 text-[9px] font-black text-blue-400 dark:text-slate-500 uppercase tracking-widest">Tipo</th>
                <th className="px-3 py-2 text-[9px] font-black text-blue-400 dark:text-slate-500 uppercase tracking-widest">Responsable</th>
                <th className="px-3 py-2 text-[9px] font-black text-blue-400 dark:text-slate-500 uppercase tracking-widest">Motivo</th>
              </tr>
            </thead>
            <tbody>
              {movements.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-4 text-slate-400 text-[9px] font-black uppercase tracking-widest">No hay movimientos registrados.</td></tr>
              ) : (
                movements.map(mov => (
                  <tr key={mov.id} className="border-b border-blue-50 dark:border-slate-800 text-[11px] font-black text-blue-950 dark:text-slate-300">
                    <td className="px-3 py-2 whitespace-nowrap">{new Date(mov.createdAt).toLocaleString()}</td>
                    <td className="px-3 py-2">{mov.product?.name || '-'}</td>
                    <td className="px-3 py-2">{mov.quantity} <span className="text-[8px] text-blue-400 uppercase">UN</span></td>
                    <td className="px-3 py-2">
                       <span className={`px-2 py-1 rounded-md text-[8px] uppercase tracking-widest ${mov.movementType === 'INBOUND' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10' : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10'}`}>
                         {mov.movementType}
                       </span>
                    </td>
                    <td className="px-3 py-2">{mov.createdBy}</td>
                    <td className="px-3 py-2 opacity-80">{mov.reason}</td>
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
