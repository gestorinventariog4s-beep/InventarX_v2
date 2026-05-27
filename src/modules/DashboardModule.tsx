import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Activity, 
  TrendingUp,
  AlertTriangle, 
  Users as UsersIcon,
  Package,
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
} from 'recharts';
import { Product, StockAlert, ReturnTicket, AppUser, DashboardDemandResponse } from '../types';

interface DashboardModuleProps {
  products: Product[];
  alerts: StockAlert[];
  returns: ReturnTicket[];
  users: AppUser[];
  demand: DashboardDemandResponse | null;
  realTimeData: Array<{ time: string; value: number }>;
  isDarkMode: boolean;
}

interface StatIslandProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  color: string;
  delay: number;
  isDarkMode: boolean;
}

const StatIsland = ({ title, value, icon: Icon, color, delay, isDarkMode }: StatIslandProps) => (
  <motion.div 
    className={`rounded-3xl p-4 lg:p-5 shadow-sm flex items-center gap-3 lg:gap-4 flex-1 min-w-[140px] lg:min-w-[200px] border transition-all ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-blue-100'}`}
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
  >
    <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl lg:rounded-2xl flex items-center justify-center shadow-sm flex-shrink-0" style={{ background: `${color}15`, color: color }}>
      <Icon className="w-5 h-5 lg:w-6 lg:h-6" strokeWidth={2.5} />
    </div>
    <div className="min-w-0">
      <h4 className={`text-xl lg:text-2xl font-black leading-tight truncate ${isDarkMode ? 'text-white' : 'text-blue-900'}`}>{value}</h4>
      <p className={`text-[8px] lg:text-[9px] font-black uppercase tracking-widest truncate ${isDarkMode ? 'text-slate-400' : 'text-blue-500'}`}>{title}</p>
    </div>
  </motion.div>
);

export const DashboardModule: React.FC<DashboardModuleProps> = ({
  products,
  alerts,
  returns,
  users,
  demand,
  realTimeData,
  isDarkMode
}) => {
  const [period, setPeriod] = useState<'hoy' | 'semana' | 'mes'>('semana');

  return (
    <div className="space-y-6 animate-fade pb-10">
      
      {/* Top Banner & Main Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Banner de Operaciones - PREMIUM GRADIENT */}
        <div className="lg:col-span-8 bg-gradient-to-br from-slate-900 via-blue-900 to-blue-950 dark:from-black dark:to-slate-900 rounded-[3rem] p-10 text-white relative overflow-hidden flex flex-col justify-between min-h-[400px] shadow-[0_30px_60px_-15px_rgba(15,23,42,0.3)] border border-white/5">
          <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-blue-500/10 to-transparent pointer-events-none" />
          <div className="absolute -top-12 -right-12 opacity-10 pointer-events-none text-blue-400 rotate-12">
            <Activity size={300} strokeWidth={1} />
          </div>
          
          <div className="relative z-10 space-y-6">
            <div className="inline-flex items-center gap-3 bg-white/5 backdrop-blur-md border border-white/10 px-5 py-2 rounded-2xl">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-200">Sincronización Inteligente</span>
            </div>
            
            <h1 className="text-6xl font-black tracking-tighter leading-tight">
              Panel de <br /> <span className="text-blue-500">Estrategia</span>
            </h1>
            
            <p className="text-slate-400 max-w-lg text-base font-medium leading-relaxed">
              Monitoreo táctico del flujo de dotación e inventarios para la optimización de recursos industriales en tiempo real.
            </p>
          </div>

          <div className="relative z-10 flex flex-wrap gap-4 mt-8">
             <StatIsland title="Personal Activo" value={users.length} icon={UsersIcon} color="#3b82f6" delay={0.1} isDarkMode={isDarkMode} />
             <StatIsland title="Alertas Críticas" value={alerts.length + returns.length} icon={AlertTriangle} color="#ef4444" delay={0.2} isDarkMode={isDarkMode} />
          </div>
        </div>

        {/* Resumen Táctico (Isla Derecha) */}
        <div className="lg:col-span-4 grid grid-cols-2 lg:grid-cols-1 lg:grid-rows-2 gap-4 lg:gap-6">
          <div className="bg-white dark:bg-white/5 border border-blue-100 dark:border-white/10 rounded-[1.5rem] lg:rounded-[2.5rem] p-5 lg:p-8 flex flex-col justify-center shadow-sm relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 lg:-right-6 lg:-top-6 text-blue-600 opacity-5 group-hover:scale-110 transition-transform"><Package className="w-24 h-24 lg:w-36 lg:h-36" /></div>
            <p className="text-[8px] lg:text-[9px] font-black text-blue-500 dark:text-slate-400 uppercase tracking-[0.2em] mb-2">Existencias Totales</p>
            <h3 className="text-3xl lg:text-5xl font-black text-blue-900 dark:text-white leading-none tracking-tighter">
              {products.reduce((acc, p) => acc + (p.stock || 0), 0).toLocaleString()}
            </h3>
            <div className="flex items-center gap-1.5 mt-3 lg:mt-4 text-emerald-600 font-black text-[7px] lg:text-[9px] uppercase tracking-widest bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1.5 rounded-lg w-fit border border-emerald-100 dark:border-emerald-500/20">
               <TrendingUp size={10} className="lg:w-3 lg:h-3" /> <span className="truncate max-w-[80px] lg:max-w-none">+12% VS MES ANT</span>
            </div>
          </div>
          
          <div className="bg-blue-600 rounded-[1.5rem] lg:rounded-[2.5rem] p-5 lg:p-8 flex flex-col justify-center shadow-lg shadow-blue-600/20 text-white relative overflow-hidden">
             <div className="absolute -right-4 -bottom-4 lg:-right-6 lg:-bottom-6 text-white opacity-10"><Activity className="w-24 h-24 lg:w-36 lg:h-36" /></div>
             <p className="text-[8px] lg:text-[9px] font-black uppercase tracking-[0.2em] mb-2 opacity-70">Movimientos Hoy</p>
             <h3 className="text-3xl lg:text-5xl font-black leading-none tracking-tighter">
               {realTimeData.length}
             </h3>
             <p className="text-[8px] lg:text-[10px] font-bold mt-2 opacity-80 uppercase tracking-widest truncate">Sincro Cloud OK</p>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Análisis de Flujo */}
        <div className="lg:col-span-8 bg-white dark:bg-white/5 border border-blue-100 dark:border-white/10 rounded-[2.5rem] p-8 flex flex-col shadow-sm min-h-[400px]">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600"><Activity size={16} /></div>
              <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-900 dark:text-slate-400">Flujo Operativo Real</h5>
            </div>
            <div className="bg-blue-50 dark:bg-black/20 p-1 rounded-2xl flex gap-1 border border-blue-100 dark:border-white/5">
              {(['hoy', 'semana', 'mes'] as const).map(p => (
                <button 
                  key={p} onClick={() => setPeriod(p)}
                  className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${period === p ? 'bg-blue-600 text-white shadow-sm' : 'text-blue-400 hover:text-blue-600'}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={realTimeData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#bfdbfe" opacity={0.4} />
                <XAxis dataKey="time" hide />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold', background: 'white', color: '#1e3a8a' }}
                />
                <Area type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={4} fillOpacity={1} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Demanda */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900/40 border border-blue-100 dark:border-white/5 rounded-[2.5rem] p-8 shadow-sm flex flex-col min-h-[400px] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-bl-[100px] -z-10" />
          
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-3">
              <motion.div 
                whileHover={{ rotate: 15 }}
                className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 shadow-inner"
              >
                <TrendingUp size={18} strokeWidth={2.5} />
              </motion.div>
              <div>
                <h5 className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-900 dark:text-white leading-none">Más Entregados</h5>
                <p className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">Top Demanda Operativa</p>
              </div>
            </div>
          </div>
          
          <div className="space-y-4 flex-1">
            {(demand?.topProducts || []).slice(0, 5).map((p: { productName: string; quantity: number }, i: number) => {
              const maxQty = demand?.topProducts[0]?.quantity || 1;
              const percentage = (p.quantity / maxQty) * 100;
              // Distinctive styling for top 3
              const isFirst = i === 0;
              const isSecond = i === 1;
              const isThird = i === 2;
              
              let rankColor = "text-slate-400 bg-slate-100 dark:bg-white/5";
              if (isFirst) rankColor = "text-amber-500 bg-amber-50 dark:bg-amber-500/10 shadow-sm border border-amber-100 dark:border-amber-500/20";
              else if (isSecond) rankColor = "text-slate-500 bg-slate-50 dark:bg-white/10 shadow-sm border border-slate-200 dark:border-white/10";
              else if (isThird) rankColor = "text-amber-700 bg-amber-50/50 dark:bg-amber-700/10 shadow-sm border border-amber-50 dark:border-amber-700/20";

              return (
                <motion.div 
                  key={i} 
                  className="group relative p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all duration-300 cursor-pointer border border-transparent hover:border-slate-100 dark:hover:border-white/5"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black flex-shrink-0 ${rankColor}`}>
                        #{i + 1}
                      </div>
                      <span className="text-xs font-black text-blue-900 dark:text-slate-200 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {p.productName}
                      </span>
                    </div>
                    <span className="text-xs font-black text-blue-600 dark:text-blue-400 flex-shrink-0 bg-blue-50 dark:bg-blue-500/10 px-2 py-1 rounded-lg">
                      {p.quantity} <span className="text-[8px] uppercase">UN</span>
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden ml-9 relative">
                    <motion.div 
                      className={`absolute top-0 left-0 h-full rounded-full ${isFirst ? 'bg-gradient-to-r from-amber-400 to-amber-500' : 'bg-gradient-to-r from-blue-500 to-blue-600'}`}
                      initial={{ width: 0 }} 
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 1, delay: i * 0.1 + 0.5, type: 'spring' }}
                    />
                  </div>
                </motion.div>
              );
            })}
            
            {(!demand?.topProducts || demand.topProducts.length === 0) && (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                <TrendingUp size={32} className="text-slate-400 mb-2" />
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Sin datos de entregas</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};