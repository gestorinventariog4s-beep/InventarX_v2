import React from 'react';
import { motion } from 'framer-motion';
import { 
  LogOut, 
  Package2
} from 'lucide-react';
import { HexagonLogo } from './HexagonLogo';
import { ModuleId, UserRole } from '../types';

interface SidebarProps {
  activeModule: ModuleId;
  setActiveModule: (id: ModuleId) => void;
  modules: ModuleId[];
  moduleLabels: Record<ModuleId, string>;
  moduleIcons: Record<ModuleId, React.ReactNode>;
  session: { username: string; fullName?: string; role: UserRole };
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeModule,
  setActiveModule,
  modules,
  moduleLabels,
  moduleIcons,
  session,
  onLogout
}) => {
  return (
    <aside className="desktop-sidebar">
      <div className="sidebar-brand">
        <div className="brand-logo text-blue-600">
          <HexagonLogo className="w-8 h-8" strokeWidth={2.5} />
        </div>
        <div className="brand-text">
          <h1>INVENTAR<span className="text-blue-600 text-[1.15em] ml-[1px]">X</span></h1>
          <p>Gestión de Dotación</p>
        </div>
      </div>

      <nav className="sidebar-nav">
        {modules.map((m) => (
          <button 
            key={m} 
            className={`sidebar-item ${activeModule === m ? 'active' : ''}`}
            onClick={() => setActiveModule(m)}
          >
            <div className="sidebar-icon">{moduleIcons[m]}</div>
            <span>{moduleLabels[m]}</span>
            {activeModule === m && <motion.div layoutId="sidebar-pill" className="active-pill" />}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-profile">
          <div className="user-avatar">
            {(session.fullName || session.username).charAt(0).toUpperCase()}
          </div>
          <div className="user-info">
            <p className="u-name">{session.fullName || session.username}</p>
            <p className="u-role">{session.role}</p>
          </div>
        </div>
        <button className="sidebar-logout" onClick={onLogout} title="Cerrar Sesión">
          <LogOut size={20} />
        </button>
      </div>
    </aside>
  );
};
