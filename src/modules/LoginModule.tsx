import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package,
  RefreshCw,
  Lock,
  User,
  ArrowRight
} from 'lucide-react';
import heroImage from '../assets/hero.png';

interface LoginModuleProps {
  loginUser?: string;
  setLoginUser?: (v: string) => void;
  loginPass?: string;
  setLoginPass?: (v: string) => void;
  onSubmit?: (e: React.FormEvent) => Promise<void>;
  onLogin?: (credentials: { username: string; password: string }) => Promise<void> | void;
  isLoading?: boolean;
  error?: string;
  isDarkMode?: boolean;
  toggleDarkMode?: () => void;
}

export const LoginModule: React.FC<LoginModuleProps> = ({
  loginUser,
  setLoginUser,
  loginPass,
  setLoginPass,
  onSubmit,
  onLogin,
  isLoading,
  error
}) => {
  const [showForgotMsg, setShowForgotMsg] = useState(false);
  const [internalUser, setInternalUser] = useState('');
  const [internalPass, setInternalPass] = useState('');
  const [cachedUser, setCachedUser] = useState<{username: string, fullName: string, puestoTrabajo: string, fotoAvatar: string | null} | null>(null);

  const resolvedUser = loginUser ?? internalUser;
  const resolvedPass = loginPass ?? internalPass;
  const isBusy = Boolean(isLoading);
  const errorMessage = error ?? '';

  useEffect(() => {
    if (!loginUser && !internalUser) {
      const remembered = localStorage.getItem('gestion-dotacion-last-user');
      if (remembered) {
        try {
          const parsed = JSON.parse(remembered);
          if (parsed.username) {
            setCachedUser(parsed);
            setInternalUser(parsed.username);
          } else {
            setInternalUser(remembered);
          }
        } catch (e) {
          setInternalUser(remembered);
        }
      }
    }
  }, []);

  const updateUser = (value: string) => {
    if (typeof setLoginUser === 'function') {
      setLoginUser(value);
      return;
    }
    setInternalUser(value);
  };

  const updatePass = (value: string) => {
    if (typeof setLoginPass === 'function') {
      setLoginPass(value);
      return;
    }
    setInternalPass(value);
  };

  const handleStandardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resolvedUser && !cachedUser) {
      // Si no hay cached user, guardamos solo el string por ahora,
      // App.tsx se encargará de guardar el JSON correcto cuando cargue el perfil.
      localStorage.setItem('gestion-dotacion-last-user', resolvedUser);
    }
    if (typeof onSubmit === 'function') {
      await onSubmit(e);
      return;
    }
    if (typeof onLogin === 'function') {
      await onLogin({ username: resolvedUser, password: resolvedPass });
    }
  };

  return (
    <main className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-white">
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[60%] bg-blue-50/50 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[30%] h-[50%] bg-slate-50 rounded-full blur-[100px]" />
      </div>

      <motion.div
        className="relative z-10 w-full max-w-[1000px] px-4 md:px-10"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "circOut" }}
      >
        <div className="bg-white rounded-[3.5rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.08)] border border-slate-100 overflow-hidden flex flex-col md:flex-row min-h-[620px]">
          
          <div className="hidden md:block md:w-1/2 relative overflow-hidden group">
            <img 
              src={heroImage}
              alt="Inventory System" 
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-blue-900/40 to-transparent" />
            <div className="absolute bottom-10 left-10 right-10">
              <div className="bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-[2rem] text-white">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-2 opacity-80 text-blue-100">Smart Logistics</p>
                <h3 className="text-2xl font-black leading-tight tracking-tighter">Control total sobre su <br /> cadena de suministros.</h3>
              </div>
            </div>
          </div>

          <div className="w-full md:w-1/2 p-10 md:p-14 flex flex-col justify-center relative">
            <div className="mb-10">
              <motion.div
                className="w-14 h-14 rounded-2xl bg-blue-600 shadow-xl shadow-blue-600/30 flex items-center justify-center text-white mb-6"
                whileHover={{ rotate: 5, scale: 1.05 }}
              >
                <Package size={28} strokeWidth={2.5} />
              </motion.div>
              <h1 className="text-slate-900 text-4xl font-black tracking-tighter mb-2">
                INVETAR<span className="text-blue-600">X</span>
              </h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ingrese a su panel operativo</p>
            </div>

            <form onSubmit={handleStandardSubmit} className="space-y-5">
              {!cachedUser ? (
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Identificador</label>
                  <div className="relative group">
                    <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-600 transition-colors" size={18} />
                    <input
                      type="text"
                      className="w-full bg-slate-50/50 border border-slate-100 rounded-[1.2rem] py-4 pl-12 pr-4 text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600/30 transition-all font-bold text-xs"
                      placeholder="Documento o Usuario"
                      value={resolvedUser}
                      onChange={(e) => updateUser(e.target.value)}
                      required
                    />
                  </div>
                </div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-slate-50/60 border border-slate-100 rounded-[2rem] p-6 flex flex-col items-center text-center relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent pointer-events-none" />
                  <div className="relative w-24 h-24 rounded-[1.5rem] bg-white shadow-xl shadow-blue-900/5 flex items-center justify-center p-1 mb-4">
                    {cachedUser.fotoAvatar ? (
                      <img src={cachedUser.fotoAvatar} alt="Avatar" className="w-full h-full rounded-[1.2rem] object-cover" />
                    ) : (
                      <div className="w-full h-full rounded-[1.2rem] bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-3xl font-black">
                        {cachedUser.fullName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight leading-none mb-1">{cachedUser.fullName}</h3>
                  <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{cachedUser.puestoTrabajo}</p>
                  
                  <button 
                    type="button" 
                    onClick={() => {
                      setCachedUser(null);
                      setInternalUser('');
                      localStorage.removeItem('gestion-dotacion-last-user');
                    }}
                    className="mt-6 text-[10px] font-bold text-slate-400 hover:text-rose-500 transition-colors uppercase tracking-widest"
                  >
                    Ingresar con otra cuenta
                  </button>
                </motion.div>
              )}

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Contraseña</label>
                  <button
                    type="button"
                    onClick={() => setShowForgotMsg(!showForgotMsg)}
                    className="text-[9px] font-black text-blue-600 hover:text-blue-700 transition-colors uppercase tracking-widest"
                  >
                    ¿Olvidó la clave?
                  </button>
                </div>
                <div className="relative group">
                  <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-600 transition-colors" size={18} />
                  <input
                    type="password"
                    className="w-full bg-slate-50/50 border border-slate-100 rounded-[1.2rem] py-4 pl-12 pr-4 text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600/30 transition-all font-bold text-xs"
                    placeholder="••••••••"
                    value={resolvedPass}
                    onChange={(e) => updatePass(e.target.value)}
                    required
                  />
                </div>
              </div>

              <AnimatePresence>
                {showForgotMsg && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="bg-blue-50/50 rounded-2xl p-4 text-[10px] text-blue-900/60 font-bold leading-relaxed border border-blue-100/50"
                  >
                    Contacte con IT o su Administrador para restablecer credenciales.
                  </motion.div>
                )}
              </AnimatePresence>

              {errorMessage && (
                <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 text-rose-600 text-[10px] font-black text-center uppercase tracking-widest">
                  {errorMessage}
                </div>
              )}

              <motion.button
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black min-h-[56px] py-5 rounded-[1.3rem] shadow-[0_14px_30px_-12px_rgba(37,99,235,0.55)] flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-50 mt-4"
                type="submit"
                disabled={isBusy}
              >
                {isBusy ? (
                  <RefreshCw className="animate-spin" />
                ) : (
                  <>
                    <span className="text-[11px] uppercase tracking-widest">Acceder al Sistema</span>
                    <ArrowRight size={18} strokeWidth={3} />
                  </>
                )}
              </motion.button>
            </form>

            <div className="mt-auto pt-10">
              <p className="text-[9px] text-slate-300 font-black uppercase tracking-[0.4em] text-center">
                © 2026 INVENTARX SYSTEM
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </main>
  );
};