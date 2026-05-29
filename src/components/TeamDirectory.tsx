import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Search, Activity } from 'lucide-react';
import { fetchEquipo } from '../services/api';
import type { UserProfile } from '../types';
import { io } from 'socket.io-client';

interface TeamDirectoryProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
}

const API_BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(/\/$/, '');

const ESTADO_COLORS: Record<string, string> = {
  DISPONIBLE: 'bg-emerald-500',
  EN_RUTA: 'bg-blue-500',
  ALMUERZO: 'bg-amber-500',
  AUSENTE: 'bg-slate-500',
};

const ESTADO_LABELS: Record<string, string> = {
  DISPONIBLE: 'Disponible',
  EN_RUTA: 'En Ruta',
  ALMUERZO: 'Almuerzo',
  AUSENTE: 'Ausente',
};

export const TeamDirectory: React.FC<TeamDirectoryProps> = ({ isOpen, onClose, isDarkMode }) => {
  const [equipo, setEquipo] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (isOpen) {
      cargarEquipo();
    }
  }, [isOpen]);

  useEffect(() => {
    // Inicializar socket connection para el namespace /perfiles
    const newSocket = io(`${API_BASE}/perfiles`, {
      transports: ['websocket'],
    });

    newSocket.on('connect', () => {
      console.log('🔗 Conectado al TeamDirectory (WebSocket)');
    });

    newSocket.on('usuario_estado_cambiado', (data: { usuarioId: string; nombre: string; avatar: string; estado: string }) => {
      setEquipo(prevEquipo => {
        const existe = prevEquipo.some(p => p.usuarioId === data.usuarioId);
        if (existe) {
          return prevEquipo.map(p => 
            p.usuarioId === data.usuarioId 
              ? { ...p, estadoActual: data.estado as any, fotoAvatar: data.avatar || p.fotoAvatar, nombreCompleto: data.nombre || p.nombreCompleto } 
              : p
          );
        } else {
          // Add new user if not in list
          return [...prevEquipo, {
            id: data.usuarioId,
            usuarioId: data.usuarioId,
            nombreCompleto: data.nombre,
            estadoActual: data.estado as any,
            fotoAvatar: data.avatar,
            creadoEn: new Date().toISOString(),
            actualizadoEn: new Date().toISOString(),
            usuario: { correo: '', rol: 'OPERADOR', sedeId: null }
          } as UserProfile];
        }
      });
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const cargarEquipo = async () => {
    setLoading(true);
    try {
      const data = await fetchEquipo();
      setEquipo(data);
    } catch (error) {
      console.error("Error cargando equipo:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEquipo = equipo.filter(p => 
    p.nombreCompleto?.toLowerCase().includes(search.toLowerCase()) || 
    p.puestoTrabajo?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[90]"
            onClick={onClose}
          />

          <motion.div
            initial={{ x: '100%', opacity: 0, scale: 0.95 }}
            animate={{ x: 0, opacity: 1, scale: 1 }}
            exit={{ x: '100%', opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={`fixed top-4 right-4 bottom-4 w-[380px] rounded-3xl shadow-2xl flex flex-col z-[100] border overflow-hidden
              ${isDarkMode 
                ? 'bg-slate-900/90 border-slate-700/50 text-white' 
                : 'bg-white/90 border-white/50 text-slate-800'
              } backdrop-blur-xl`}
          >
            {/* Header */}
            <div className={`p-6 border-b flex items-center justify-between
              ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                  <Users size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight">Directorio</h2>
                  <div className="flex items-center gap-1.5 text-xs font-medium opacity-60">
                    <Activity size={12} className="text-emerald-500 animate-pulse" />
                    <span>En vivo</span>
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className={`p-2 rounded-full transition-colors
                  ${isDarkMode ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'}`}
              >
                <X size={20} />
              </button>
            </div>

            {/* Search */}
            <div className={`p-4 border-b ${isDarkMode ? 'border-slate-800/50' : 'border-slate-100'}`}>
              <div className="relative">
                <Search size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                <input
                  type="text"
                  placeholder="Buscar compañero..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className={`w-full pl-11 pr-4 py-3 rounded-2xl outline-none transition-all text-sm font-medium
                    ${isDarkMode 
                      ? 'bg-slate-800/50 focus:bg-slate-800 text-white placeholder-slate-500' 
                      : 'bg-slate-50 focus:bg-slate-100 text-slate-900 placeholder-slate-400'
                    }`}
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
                  <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm font-medium">Cargando equipo...</span>
                </div>
              ) : filteredEquipo.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
                  <Users size={32} className="opacity-20" />
                  <span className="text-sm font-medium">No se encontraron resultados</span>
                </div>
              ) : (
                filteredEquipo.map((perfil) => (
                  <motion.div
                    key={perfil.usuarioId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex items-center gap-4 p-3 rounded-2xl transition-all
                      ${isDarkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}`}
                  >
                    <div className="relative">
                      {perfil.fotoAvatar ? (
                        <img 
                          src={perfil.fotoAvatar} 
                          alt={perfil.nombreCompleto} 
                          className="w-12 h-12 rounded-full object-cover border-2 border-transparent shadow-sm"
                        />
                      ) : (
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shadow-sm
                          ${isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600'}`}>
                          {perfil.nombreCompleto?.charAt(0) || 'U'}
                        </div>
                      )}
                      
                      <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 
                        ${isDarkMode ? 'border-slate-900' : 'border-white'} 
                        ${ESTADO_COLORS[perfil.estadoActual || 'DISPONIBLE']}`} 
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm truncate">
                        {perfil.nombreCompleto || 'Usuario Nuevo'}
                      </h3>
                      <p className={`text-xs font-medium truncate mt-0.5
                        ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                        {perfil.puestoTrabajo || perfil.usuario?.rol || 'Miembro del Equipo'}
                      </p>
                    </div>

                    <div className={`text-[10px] font-bold tracking-wider uppercase px-2 py-1 rounded-full
                      ${isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                      {ESTADO_LABELS[perfil.estadoActual || 'DISPONIBLE']}
                    </div>
                  </motion.div>
                ))
              )}
            </div>

          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
