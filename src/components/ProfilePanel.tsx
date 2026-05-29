import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, X, CheckCircle2, Navigation, Coffee, Moon, Edit3, Save, Loader2 } from 'lucide-react';
import { getMiPerfil, updatePerfil, updateEstado, uploadAvatar, uploadPortada } from '../services/api';
import { UserProfile } from '../types';

interface ProfilePanelProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  session: any;
  showToast: (type: 'success' | 'error', message: string) => void;
  onProfileUpdate?: (profile: UserProfile) => void;
}

export const ProfilePanel: React.FC<ProfilePanelProps> = ({
  isOpen,
  onClose,
  isDarkMode,
  session,
  showToast,
  onProfileUpdate
}) => {
  const [perfil, setPerfil] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingPortada, setIsUploadingPortada] = useState(false);

  // Form states
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [apodo, setApodo] = useState('');
  const [puestoTrabajo, setPuestoTrabajo] = useState('');
  const [biografia, setBiografia] = useState('');

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const portadaInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadProfile();
    }
  }, [isOpen]);

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      const data = await getMiPerfil();
      setPerfil(data);
      if (onProfileUpdate) onProfileUpdate(data);
      setNombreCompleto(data.nombreCompleto || session.fullName || '');
      setApodo(data.apodo || '');
      setPuestoTrabajo(data.puestoTrabajo || '');
      setBiografia(data.biografia || '');
    } catch (err) {
      showToast('error', 'Error al cargar perfil');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveInfo = async () => {
    try {
      setIsLoading(true);
      const res = await updatePerfil({
        nombreCompleto,
        apodo,
        puestoTrabajo,
        biografia
      });
      setPerfil(res);
      if (onProfileUpdate) onProfileUpdate(res);
      setIsEditing(false);
      showToast('success', 'Perfil actualizado');
    } catch (err) {
      showToast('error', 'Error al guardar perfil');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangeEstado = async (estado: 'DISPONIBLE' | 'EN_RUTA' | 'ALMUERZO' | 'AUSENTE') => {
    try {
      const res = await updateEstado(estado);
      setPerfil(res);
      if (onProfileUpdate) onProfileUpdate(res);
      showToast('success', 'Estado actualizado');
    } catch (err) {
      showToast('error', 'Error al actualizar estado');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'portada') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      try {
        if (type === 'avatar') {
          setIsUploadingAvatar(true);
          const res = await uploadAvatar(base64);
          setPerfil(res);
          if (onProfileUpdate) onProfileUpdate(res);
        } else {
          setIsUploadingPortada(true);
          const res = await uploadPortada(base64);
          setPerfil(res);
          if (onProfileUpdate) onProfileUpdate(res);
        }
        showToast('success', 'Imagen actualizada con éxito');
      } catch (err) {
        showToast('error', 'Error al subir la imagen');
      } finally {
        setIsUploadingAvatar(false);
        setIsUploadingPortada(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const statusConfig = {
    DISPONIBLE: { color: 'bg-emerald-500', text: 'text-emerald-500', icon: CheckCircle2, label: 'Disponible' },
    EN_RUTA: { color: 'bg-blue-500', text: 'text-blue-500', icon: Navigation, label: 'En Ruta' },
    ALMUERZO: { color: 'bg-amber-500', text: 'text-amber-500', icon: Coffee, label: 'Almuerzo' },
    AUSENTE: { color: 'bg-rose-500', text: 'text-rose-500', icon: Moon, label: 'Ausente' }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[110]"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={`fixed top-0 right-0 h-full w-full max-w-md z-[120] shadow-2xl flex flex-col ${isDarkMode ? 'bg-slate-900 border-l border-white/10' : 'bg-white border-l border-slate-200'}`}
          >
            {/* Headers / Portada */}
            <div className="relative h-48 group">
              {perfil?.fotoPortada ? (
                <img src={perfil.fotoPortada} alt="Portada" className="w-full h-full object-cover" />
              ) : (
                <div className={`w-full h-full bg-gradient-to-br ${isDarkMode ? 'from-slate-800 to-slate-700' : 'from-blue-100 to-blue-50'}`} />
              )}
              
              <div className="absolute top-4 right-4 z-10 flex gap-2">
                <button
                  onClick={() => portadaInputRef.current?.click()}
                  className="p-2 bg-black/50 hover:bg-black/70 backdrop-blur-md rounded-full text-white transition-colors"
                  title="Cambiar Portada"
                >
                  {isUploadingPortada ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
                </button>
                <button
                  onClick={onClose}
                  className="p-2 bg-black/50 hover:bg-black/70 backdrop-blur-md rounded-full text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Avatar Flotante */}
              <div className="absolute -bottom-12 left-6 group/avatar">
                <div className={`relative w-24 h-24 rounded-2xl border-4 shadow-xl overflow-hidden ${isDarkMode ? 'border-slate-900 bg-slate-800' : 'border-white bg-slate-100'}`}>
                  {perfil?.fotoAvatar ? (
                    <img src={perfil.fotoAvatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl font-black text-slate-400">
                      {(perfil?.nombreCompleto || session.username).charAt(0).toUpperCase()}
                    </div>
                  )}
                  
                  <button
                    onClick={() => avatarInputRef.current?.click()}
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center text-white"
                  >
                    {isUploadingAvatar ? <Loader2 className="w-6 h-6 animate-spin" /> : <Camera className="w-6 h-6" />}
                  </button>
                </div>
              </div>
            </div>

            <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'avatar')} />
            <input type="file" ref={portadaInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'portada')} />

            {/* Contenido Principal */}
            <div className="flex-1 overflow-y-auto px-6 pt-16 pb-6">
              {isLoading && !perfil ? (
                <div className="flex justify-center py-10">
                  <Loader2 className={`w-8 h-8 animate-spin ${isDarkMode ? 'text-white' : 'text-blue-600'}`} />
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Info Basica */}
                  <div className="flex justify-between items-start">
                    <div>
                      {isEditing ? (
                        <div className="space-y-3">
                          <input
                            type="text"
                            value={nombreCompleto}
                            onChange={e => setNombreCompleto(e.target.value)}
                            className={`w-full text-xl font-black rounded-lg px-3 py-2 outline-none border ${isDarkMode ? 'bg-black/30 border-white/10 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'}`}
                            placeholder="Nombre Completo"
                          />
                          <input
                            type="text"
                            value={apodo}
                            onChange={e => setApodo(e.target.value)}
                            className={`w-full text-sm font-bold rounded-lg px-3 py-2 outline-none border ${isDarkMode ? 'bg-black/30 border-white/10 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'}`}
                            placeholder="Apodo"
                          />
                          <input
                            type="text"
                            value={puestoTrabajo}
                            onChange={e => setPuestoTrabajo(e.target.value)}
                            className={`w-full text-sm rounded-lg px-3 py-2 outline-none border ${isDarkMode ? 'bg-black/30 border-white/10 text-slate-300 focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-600 focus:border-blue-500'}`}
                            placeholder="Puesto de Trabajo"
                          />
                        </div>
                      ) : (
                        <>
                          <h2 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            {perfil?.nombreCompleto || session.fullName || session.username}
                          </h2>
                          {(perfil?.apodo || perfil?.puestoTrabajo) && (
                            <p className={`font-bold mt-1 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                              {perfil?.apodo ? `"${perfil.apodo}"` : ''} {perfil?.apodo && perfil?.puestoTrabajo && '•'} {perfil?.puestoTrabajo}
                            </p>
                          )}
                          <p className={`text-[10px] font-black uppercase tracking-widest mt-2 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                            ROL: {session.role}
                          </p>
                        </>
                      )}
                    </div>
                    
                    <button
                      onClick={() => isEditing ? handleSaveInfo() : setIsEditing(true)}
                      disabled={isLoading}
                      className={`p-2 rounded-xl transition-colors ${isEditing ? 'bg-blue-600 text-white hover:bg-blue-700' : (isDarkMode ? 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10' : 'bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200')}`}
                    >
                      {isEditing ? <Save className="w-5 h-5" /> : <Edit3 className="w-5 h-5" />}
                    </button>
                  </div>

                  {/* Estado */}
                  <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-100'}`}>
                    <h3 className={`text-[10px] font-black uppercase tracking-widest mb-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Estado de Disponibilidad</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {(Object.keys(statusConfig) as Array<keyof typeof statusConfig>).map((estado) => {
                        const config = statusConfig[estado];
                        const isActive = perfil?.estadoActual === estado;
                        return (
                          <button
                            key={estado}
                            onClick={() => handleChangeEstado(estado)}
                            className={`flex items-center gap-2 p-3 rounded-xl transition-all border ${
                              isActive 
                                ? `${config.color} text-white border-transparent shadow-lg shadow-${config.color.split('-')[1]}-500/30` 
                                : `${isDarkMode ? 'bg-transparent border-white/10 text-slate-400 hover:bg-white/5' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`
                            }`}
                          >
                            <config.icon className="w-4 h-4" />
                            <span className="text-xs font-bold">{config.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Biografia */}
                  <div>
                    <h3 className={`text-[10px] font-black uppercase tracking-widest mb-3 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Sobre Mí</h3>
                    {isEditing ? (
                      <textarea
                        value={biografia}
                        onChange={e => setBiografia(e.target.value)}
                        className={`w-full rounded-xl px-4 py-3 outline-none border min-h-[120px] resize-none ${isDarkMode ? 'bg-black/30 border-white/10 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'}`}
                        placeholder="Escribe algo sobre ti..."
                      />
                    ) : (
                      <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                        {perfil?.biografia || 'Sin biografía.'}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
