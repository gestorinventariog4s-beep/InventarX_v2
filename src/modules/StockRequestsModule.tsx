import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Package, Activity, Loader2 } from 'lucide-react';
import { AuthResponse } from '../types';
import { fetchDashboardStats } from '../services/api';

interface StockRequestsModuleProps {
  session: AuthResponse | null;
  onLogout: () => void;
  isDarkMode: boolean;
}

export const StockRequestsModule: React.FC<StockRequestsModuleProps> = ({ session, onLogout, isDarkMode }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const stats = await fetchDashboardStats(session, onLogout);
        setData(stats);
      } catch (err) {
        console.error('Error fetching stock requests:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [session, onLogout]);

  const alertas = data?.prediccion_desabastecimiento || [];

  return (
    <div className="space-y-6 animate-fade pb-10">
      {/* Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 dark:from-black dark:via-blue-950 dark:to-slate-900 rounded-[3rem] p-10 text-white relative overflow-hidden flex flex-col justify-between min-h-[300px] shadow-[0_30px_60px_-15px_rgba(15,23,42,0.4)] border border-blue-500/10">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-blue-500/10 to-transparent pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 opacity-5 pointer-events-none text-blue-400">
          <Activity size={320} strokeWidth={0.5} />
        </div>
        {/* Animated glow orbs */}
        <div className="absolute top-6 right-32 w-40 h-40 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-6 right-10 w-24 h-24 rounded-full bg-indigo-500/15 blur-2xl pointer-events-none" />
        
        <div className="relative z-10 space-y-6">
          <div className="inline-flex items-center gap-3 bg-white/5 backdrop-blur-md border border-blue-500/20 px-5 py-2 rounded-2xl">
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-300">Motor Predictivo IA</span>
          </div>
          
          <h1 className="text-5xl lg:text-6xl font-black tracking-tighter leading-tight">
            Análisis de <br /> <span className="text-blue-400">Stock IA</span>
          </h1>
          
          <p className="text-slate-400 max-w-lg text-base font-medium leading-relaxed">
            Gestión inteligente de reabastecimiento. La IA analiza el flujo de inventario y predice cuándo un producto está a punto de agotarse.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white dark:bg-white/5 border border-amber-100 dark:border-white/10 rounded-[2.5rem] p-8 shadow-sm min-h-[400px]">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600">
            <Activity size={20} strokeWidth={2.5} />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white leading-none">Matriz de Abastecimiento</h3>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Predicción y Estado de Inventario</p>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 opacity-50">
            <Loader2 className="w-10 h-10 animate-spin text-amber-500 mb-4" />
            <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Analizando matrices...</span>
          </div>
        ) : alertas.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 opacity-50">
            <Package size={48} strokeWidth={1} className="text-slate-400 mb-4" />
            <p className="text-lg font-bold text-slate-700 dark:text-slate-300">Inventario Vacío</p>
            <p className="text-xs font-medium text-slate-500 mt-2">No hay productos en el inventario para analizar.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {alertas.map((alerta: any, index: number) => {
              const isUrgent = alerta.dias_cobertura <= 3 && alerta.es_critico;
              const isWarning = alerta.es_critico && !isUrgent;
              
              let cardBg = isUrgent ? 'bg-red-50 dark:bg-red-500/5 border-red-200 dark:border-red-500/20' : isWarning ? 'bg-amber-50 dark:bg-amber-500/5 border-amber-200 dark:border-amber-500/20' : 'bg-emerald-50 dark:bg-emerald-500/5 border-emerald-200 dark:border-emerald-500/20';
              let badgeBg = isUrgent ? 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400' : isWarning ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400';
              let iconBg = isUrgent ? 'bg-red-100 text-red-500 dark:bg-red-500/20' : isWarning ? 'bg-amber-100 text-amber-500 dark:bg-amber-500/20' : 'bg-emerald-100 text-emerald-500 dark:bg-emerald-500/20';
              let textColor = isUrgent ? 'text-red-600 dark:text-red-400' : isWarning ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400';
              let barColor = isUrgent ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500';

              return (
                <motion.div 
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`relative p-6 rounded-3xl border transition-all hover:shadow-lg ${cardBg}`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg ${badgeBg}`}>
                        {alerta.sku}
                      </span>
                      <h4 className={`text-lg font-black mt-3 leading-tight ${
                        isDarkMode ? 'text-white' : 'text-slate-900'
                      }`}>
                        {alerta.nombre}
                      </h4>
                    </div>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-inner ${iconBg}`}>
                      {alerta.es_critico ? <AlertTriangle size={18} strokeWidth={2.5} /> : <Activity size={18} strokeWidth={2.5} />}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Días Cobertura</span>
                      <span className={`text-3xl font-black leading-none tracking-tighter ${textColor}`}>
                        {alerta.dias_cobertura >= 365 ? '∞' : Math.max(0, Math.floor(alerta.dias_cobertura))}
                        <span className="text-xs font-bold ml-1 opacity-70 uppercase">días</span>
                      </span>
                    </div>

                    <div className="w-full h-1.5 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${barColor}`}
                        style={{ width: `${Math.min(100, Math.max(5, (alerta.dias_cobertura / 7) * 100))}%` }}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200 dark:border-white/10">
                      <div>
                        <span className="block text-[8px] font-bold text-slate-500 uppercase tracking-widest mb-1">Stock Actual</span>
                        <span className={`text-sm font-black ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                          {alerta.stockActual}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[8px] font-bold text-slate-500 uppercase tracking-widest mb-1">Stock Mínimo</span>
                        <span className={`text-sm font-black ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                          {alerta.stockMinimo}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Tallas Críticas */}
                  {alerta.tallas_criticas && alerta.tallas_criticas.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-white/10">
                      <span className="block text-[8px] font-bold text-slate-500 uppercase tracking-widest mb-2">Tallas en Riesgo Crítico (≤ 5 uds)</span>
                      <div className="flex flex-wrap gap-2">
                        {alerta.tallas_criticas.map((tc: any, i: number) => (
                          <div key={i} className="bg-red-100 dark:bg-red-500/20 px-3 py-1.5 rounded-lg flex items-center gap-2">
                            <span className="text-xs font-black text-red-600 dark:text-red-400 uppercase">{tc.talla}</span>
                            <span className="text-[10px] font-bold bg-white dark:bg-black/20 text-red-500 px-1.5 py-0.5 rounded-md">
                              {tc.stock} uds
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
