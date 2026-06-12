import React from 'react';
import { LogOut, Activity, Box, Truck, QrCode, BarChart3, Users, Sun, Moon, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { ModuleId, AuthResponse, UserProfile } from '../types';

import { HexagonLogo } from './HexagonLogo';

interface HeaderProps {
  activeModule: ModuleId;
  setActiveModule: (v: ModuleId) => void;
  session: AuthResponse;
  onLogout: () => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  onOpenProfile?: () => void;
  onOpenTeam?: () => void;
  userProfile?: UserProfile | null;
}

export const Header: React.FC<HeaderProps> = ({
  activeModule,
  setActiveModule,
  session,
  onLogout,
  isDarkMode,
  toggleDarkMode,
  onOpenProfile,
  onOpenTeam,
  userProfile
}) => {
  const navItems = [
    { id: 'resumen' as ModuleId, label: 'Panel', icon: Activity },
    { id: 'inventario' as ModuleId, label: 'Inventario', icon: Box },
    { id: 'entregas' as ModuleId, label: 'Despacho', icon: Truck },
    { id: 'solicitudes-stock' as ModuleId, label: 'Stock IA', icon: AlertTriangle },
    { id: 'qr' as ModuleId, label: 'Mi QR', icon: QrCode },
    { id: 'auditoria' as ModuleId, label: 'Auditoría', icon: BarChart3 },
    { id: 'usuarios' as ModuleId, label: 'Talento', icon: Users },
  ].filter((item) => (item.id === 'usuarios' ? session.role === 'ADMINISTRADOR' : true));

  return (
    <>
      <header className="sticky top-0 z-[100] px-4 md:px-12 py-4 flex justify-center w-full">
        <div className={`w-full max-w-[1700px] flex justify-between items-center border rounded-[3rem] p-4 px-10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.2)] transition-all duration-700 backdrop-blur-3xl ${isDarkMode ? 'bg-black/40 border-white/10' : 'bg-white/70 border-white/40'}`}>
  
          {/* Branding Area */}
          <div className="flex items-center gap-2.5 lg:gap-3 flex-shrink-0">
            <motion.div
              whileHover={{ rotate: -10, scale: 1.1, filter: 'brightness(1.2)' }}
              className="bg-gradient-to-br from-blue-500 to-blue-700 w-10 h-10 lg:w-12 lg:h-12 rounded-xl lg:rounded-[1.2rem] flex items-center justify-center text-white shadow-2xl shadow-blue-500/40 cursor-pointer"
            >
              <HexagonLogo className="w-6 h-6 lg:w-7 lg:h-7" strokeWidth={2.5} />
            </motion.div>
            <div>
              <h2 className={`text-xl lg:text-2xl font-black tracking-tighter leading-none ${isDarkMode ? 'text-white' : 'text-slate-950'}`}>
                INVENTAR<span className="text-blue-600 text-[1.15em] ml-[1px]">X</span>
              </h2>
            </div>
          </div>
  
          {/* Dynamic Navigation Pill (DESKTOP) */}
          <nav className={`hidden xl:flex relative p-1.5 rounded-[2.5rem] border transition-all ${isDarkMode ? 'bg-black/20 border-white/5' : 'bg-slate-100/40 border-slate-200/50'}`}>
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveModule(item.id)}
                className="relative flex items-center gap-2 px-3 xl:px-4 py-2.5 rounded-[2rem] text-[9px] xl:text-[10px] font-black uppercase tracking-widest transition-all duration-500 group overflow-hidden whitespace-nowrap"
              >
                {activeModule === item.id && (
                  <motion.div
                    layoutId="activePill"
                    className="absolute inset-0 bg-blue-600 shadow-xl shadow-blue-600/40 z-0"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <span className={`relative z-10 flex items-center gap-2.5 transition-colors duration-300 ${activeModule === item.id ? 'text-white' : (isDarkMode ? 'text-slate-500 group-hover:text-white' : 'text-slate-500 group-hover:text-slate-950')}`}>
                  <item.icon className="w-4 h-4" strokeWidth={2.5} />
                  <span className="opacity-90">{item.label}</span>
                </span>
              </button>
            ))}
          </nav>
  
          {/* User & Utils Area */}
          <div className="flex items-center gap-3 lg:gap-4 flex-shrink-0 justify-end">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={toggleDarkMode}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all border ${isDarkMode ? 'bg-white/5 border-white/10 text-amber-400 hover:bg-white/10' : 'bg-white border-slate-200 text-slate-950 hover:bg-slate-50 shadow-sm'}`}
            >
              {isDarkMode ? <Sun size={20} strokeWidth={2.5} /> : <Moon size={20} strokeWidth={2.5} />}
            </motion.button>
  
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onOpenTeam}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all border ${isDarkMode ? 'bg-white/5 border-white/10 text-blue-400 hover:bg-white/10' : 'bg-white border-slate-200 text-blue-600 hover:bg-slate-50 shadow-sm'}`}
              title="Directorio de Equipo"
            >
              <Users size={20} strokeWidth={2.5} />
            </motion.button>
  
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onOpenProfile}
              className={`hidden sm:flex items-center gap-3 pl-4 pr-2 py-1.5 border-l transition-all cursor-pointer focus:outline-none rounded-xl group ${isDarkMode ? 'border-white/10 hover:bg-white/5' : 'border-slate-200 hover:bg-slate-50'}`}
            >
              <div className="text-right">
                <p className={`text-sm font-black leading-none transition-colors ${isDarkMode ? 'text-white group-hover:text-blue-400' : 'text-slate-950 group-hover:text-blue-600'}`}>
                  {userProfile?.nombreCompleto?.split(' ')[0] || session.fullName?.split(' ')[0] || session.username}
                </p>
                <p className="text-[8px] font-black text-blue-500 uppercase tracking-widest mt-1.5 opacity-80">
                  {userProfile?.puestoTrabajo || session.role}
                </p>
              </div>
              <div className="relative">
                {(userProfile?.fotoAvatar || session.fotoAvatar) ? (
                  <img src={userProfile?.fotoAvatar || session.fotoAvatar} alt="Avatar" className="w-10 h-10 rounded-xl object-cover shadow-md border border-slate-200 dark:border-white/10" />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-black shadow-md">
                    {(userProfile?.nombreCompleto || session.fullName || session.username).charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full" />
              </div>
            </motion.button>
  
            <motion.button
              whileHover={{ scale: 1.1, backgroundColor: '#e11d48', color: '#fff' }}
              whileTap={{ scale: 0.9 }}
              onClick={onLogout}
              className="w-12 h-12 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-600 flex items-center justify-center transition-all"
            >
              <LogOut size={20} strokeWidth={2.5} />
            </motion.button>
          </div>
        </div>
      </header>

      {/* Dynamic Navigation Pill (MOBILE - BOTTOM BAR) */}
      <nav className={`flex xl:hidden fixed bottom-0 left-0 w-full justify-around px-2 pb-8 pt-3 z-[100] rounded-t-[2rem] border-t ${isDarkMode ? 'bg-slate-950/90 backdrop-blur-xl border-white/10 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.5)]' : 'bg-white/95 backdrop-blur-xl border-slate-200 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]'}`}>
        {navItems.map((item) => (
          <button
            key={`mob-${item.id}`}
            onClick={() => setActiveModule(item.id)}
            className="relative flex items-center flex-col gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 group overflow-hidden"
          >
            {activeModule === item.id && (
              <motion.div
                layoutId="activePillMobile"
                className="absolute inset-0 bg-blue-600 shadow-xl shadow-blue-600/40 z-0 rounded-xl"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
              />
            )}
            <span className={`relative z-10 flex flex-col items-center gap-1 transition-colors duration-300 ${activeModule === item.id ? 'text-white' : (isDarkMode ? 'text-slate-500 group-hover:text-white' : 'text-slate-500 group-hover:text-slate-950')}`}>
              <item.icon className="w-5 h-5" strokeWidth={2.5} />
              <span className="opacity-90 text-[8px] tracking-widest hidden sm:block">{item.label}</span>
            </span>
          </button>
        ))}
      </nav>
    </>
  );
};
