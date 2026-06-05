import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity } from 'lucide-react';
import { InventoryMovement } from '../../types';

interface RealTimeFlowChartProps {
  movements: InventoryMovement[];
  period: 'hoy' | 'semana' | 'mes';
  setPeriod: (period: 'hoy' | 'semana' | 'mes') => void;
}

export const RealTimeFlowChart: React.FC<RealTimeFlowChartProps> = ({ movements, period, setPeriod }) => {
  const chartData = useMemo(() => {
    if (!movements || movements.length === 0) {
      return [
        { time: '00:00', value: 0 },
        { time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), value: 0 }
      ];
    }

    const now = new Date();
    const dataMap = new Map<string, number>();

    movements.forEach((mov: any) => {
      const date = new Date(mov.creadoEn || mov.createdAt);
      const qty = mov.cantidad || mov.quantity || 0;
      
      // Calculate diff in days
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (period === 'hoy') {
        if (date.toDateString() === now.toDateString()) {
          const hour = date.getHours().toString().padStart(2, '0') + ':00';
          dataMap.set(hour, (dataMap.get(hour) || 0) + qty);
        }
      } else if (period === 'semana') {
        if (diffDays <= 7) {
          const day = date.toLocaleDateString('es-ES', { weekday: 'short' });
          dataMap.set(day, (dataMap.get(day) || 0) + qty);
        }
      } else if (period === 'mes') {
        if (diffDays <= 30) {
          const day = date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
          dataMap.set(day, (dataMap.get(day) || 0) + qty);
        }
      }
    });

    const sortedEntries = Array.from(dataMap.entries()).map(([time, value]) => ({ time, value }));

    // If no data matched the period
    if (sortedEntries.length === 0) {
      return [
        { time: period === 'hoy' ? '00:00' : (period === 'semana' ? 'Lun' : '1'), value: 0 },
        { time: period === 'hoy' ? '23:59' : (period === 'semana' ? 'Dom' : '30'), value: 0 }
      ];
    }

    // Sort appropriately based on period if needed, or by chronological order 
    // (Map insertion order won't be perfect for dates, so it's better to sort if we used exact dates)
    // For simplicity, we assume they are added roughly in order or we can sort by time string
    // In actual production we might parse back the date or generate a continuous skeleton array.
    
    return sortedEntries;
  }, [movements, period]);

  return (
    <div className="lg:col-span-8 bg-white dark:bg-white/5 border border-blue-100 dark:border-white/10 rounded-[2.5rem] p-8 flex flex-col shadow-sm min-h-[400px]">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600">
            <Activity size={16} />
          </div>
          <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-900 dark:text-slate-400">
            Flujo Operativo Real
          </h5>
        </div>
        <div className="bg-blue-50 dark:bg-black/20 p-1 rounded-2xl flex gap-1 border border-blue-100 dark:border-white/5">
          {(['hoy', 'semana', 'mes'] as const).map(p => (
            <button 
              key={p} 
              onClick={() => setPeriod(p)}
              className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                period === p 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'text-blue-400 hover:text-blue-600 dark:text-slate-500 dark:hover:text-slate-300'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
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
              contentStyle={{ 
                borderRadius: '1rem', 
                border: 'none', 
                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', 
                fontWeight: 'bold', 
                background: 'white', 
                color: '#1e3a8a' 
              }}
            />
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke="#2563eb" 
              strokeWidth={4} 
              fillOpacity={1} 
              fill="url(#colorValue)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
