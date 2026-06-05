import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';
import { InventoryMovement } from '../../types';

interface TopDemandChartProps {
  movements: InventoryMovement[];
  period: 'hoy' | 'semana' | 'mes';
}

export const TopDemandChart: React.FC<TopDemandChartProps> = ({ movements, period }) => {
  const topProducts = useMemo(() => {
    const now = new Date();
    
    // Filter out everything except outbound/salida
    const outbound = movements.filter((m: any) => 
      m.movementType === 'OUTBOUND' || m.movementType === 'SALIDA' || m.tipo === 'SALIDA'
    );

    const productCounts = new Map<string, number>();

    outbound.forEach((mov: any) => {
      const date = new Date(mov.creadoEn || mov.createdAt);
      const qty = mov.cantidad || mov.quantity || 0;
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let include = false;
      if (period === 'hoy') {
        include = date.toDateString() === now.toDateString();
      } else if (period === 'semana') {
        include = diffDays <= 7;
      } else if (period === 'mes') {
        include = diffDays <= 30;
      }

      if (include) {
        const name = mov.producto?.nombre || mov.product?.name || 'Producto Desconocido';
        productCounts.set(name, (productCounts.get(name) || 0) + qty);
      }
    });

    return Array.from(productCounts.entries())
      .map(([productName, quantity]) => ({ productName, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  }, [movements, period]);

  return (
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
            <h5 className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-900 dark:text-white leading-none">
              Más Entregados
            </h5>
            <p className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">
              Top Demanda Operativa ({period})
            </p>
          </div>
        </div>
      </div>
      
      <div className="space-y-4 flex-1">
        {topProducts.map((p, i) => {
          const maxQty = topProducts[0]?.quantity || 1;
          const percentage = (p.quantity / maxQty) * 100;
          
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
        
        {topProducts.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-50 mt-10">
            <TrendingUp size={32} className="text-slate-400 mb-2" />
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Sin datos de entregas ({period})
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
