import React, { useMemo, useState } from 'react';
import { 
  Users as UsersIcon, 
  UserPlus, 
  UserCheck,
  Mail,
  Lock,
  Pencil,
  Trash2,
  PauseCircle,
  X,
} from 'lucide-react';
import { AppUser, UpdateUserPayload, UserRole } from '../types';

interface UsersModuleProps {
  users: AppUser[];
  newUserForm: { document: string; password: string; fullName: string; role: UserRole };
  setNewUserForm: (v: { document: string; password: string; fullName: string; role: UserRole }) => void;
  onSubmitNewUser: () => Promise<void>;
  onUpdateUser: (id: number | string, payload: UpdateUserPayload) => Promise<void>;
  onSuspendUser: (id: number | string) => Promise<void>;
  onDeleteUser: (id: number | string) => Promise<void>;
  isLoading: boolean;
}

export const UsersModule: React.FC<UsersModuleProps> = ({
  users,
  newUserForm,
  setNewUserForm,
  onSubmitNewUser,
  onUpdateUser,
  onSuspendUser,
  onDeleteUser,
  isLoading
}) => {
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [editForm, setEditForm] = useState<UpdateUserPayload>({ document: '', fullName: '', role: 'OPERADOR', password: '' });

  const canEdit = useMemo(() => true, []);

  const openEdit = (user: AppUser) => {
    setEditingUser(user);
    setEditForm({
      document: user.document ?? user.username,
      fullName: user.fullName,
      role: user.role,
      password: '',
    });
  };

  const closeEdit = () => {
    setEditingUser(null);
    setEditForm({ document: '', fullName: '', role: 'OPERADOR', password: '' });
  };

  const saveEdit = async () => {
    if (!editingUser) return;
    await onUpdateUser(editingUser.id, editForm);
    closeEdit();
  };

  return (
    <div className="space-y-8 animate-fade pb-20">
      
      {/* Header Section - UNIFIED 8/4 BENTO STYLE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Registro de Personal */}
        <div className="lg:col-span-8 bg-slate-900 dark:bg-black/40 rounded-[2.5rem] p-10 text-white relative overflow-hidden flex flex-col justify-between min-h-[380px] shadow-2xl border border-white/5">
          <div className="absolute -top-10 -right-10 opacity-10 pointer-events-none text-blue-500">
            <UserPlus size={350} />
          </div>
          
          <div className="relative z-10 space-y-6">
            <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/20 px-5 py-2 rounded-2xl">
              <UserCheck size={16} className="text-blue-400" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Censo de Capital Humano</span>
            </div>
            
            <h1 className="text-6xl font-black tracking-tighter leading-none">
              Gestión de <br /> <span className="text-blue-500">Talento</span>
            </h1>
            
            <p className="text-slate-400 max-w-md text-sm font-medium leading-relaxed">
              Administración centralizada de roles, accesos y perfiles operativos para la seguridad del ecosistema.
            </p>
          </div>

          <div className="relative z-10 flex gap-4">
             <div className="bg-white/5 border border-white/10 rounded-2xl px-6 py-4 flex items-center gap-4">
                <UsersIcon size={24} className="text-blue-500" />
                <div>
                   <p className="text-2xl font-black">{users.length}</p>
                   <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">Colaboradores Activos</p>
                </div>
             </div>
          </div>
        </div>

        {/* Formulario de Alta (Isla Derecha) */}
        <div className="lg:col-span-4 bg-white/80 dark:bg-white/5 dark:border-white/10 backdrop-blur-xl border border-white/40 rounded-[2.5rem] p-8 shadow-sm flex flex-col justify-between">
          <div className="space-y-6">
            <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] mb-4">Nuevo Colaborador</p>
            
            <div className="space-y-4">
               <div className="relative group">
                 <UserCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500" size={18} />
                 <input 
                   className="w-full bg-slate-100 dark:bg-white/5 border-none rounded-2xl py-4 pl-12 pr-4 text-xs font-black text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/10"
                   placeholder="Nombre Completo..." value={newUserForm.fullName} 
                   onChange={(e) => setNewUserForm({...newUserForm, fullName: e.target.value})} required 
                 />
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      className="w-full bg-slate-100 dark:bg-white/5 border-none rounded-2xl py-3.5 pl-10 pr-4 text-[10px] font-black text-slate-900 dark:text-white outline-none"
                      placeholder="Documento ID..." value={newUserForm.document} 
                      onChange={(e) => setNewUserForm({...newUserForm, document: e.target.value})} required 
                    />
                  </div>
                  <select 
                     className="w-full bg-slate-100 dark:bg-white/5 border-none rounded-2xl py-3.5 px-4 text-[10px] font-black text-slate-900 dark:text-white outline-none appearance-none"
                     value={newUserForm.role} onChange={(e) => setNewUserForm({...newUserForm, role: e.target.value as UserRole})} required
                   >
                     <option value="OPERADOR">OPERADOR</option>
                     <option value="ADMINISTRADOR">ADMINISTRADOR</option>
                     <option value="AUDITOR">AUDITOR</option>
                   </select>
               </div>

               <div className="relative group">
                 <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                 <input 
                   className="w-full bg-slate-100 dark:bg-white/5 border-none rounded-2xl py-4 pl-12 pr-4 text-xs font-black text-slate-900 dark:text-white outline-none"
                   type="password" placeholder="Contraseña..." value={newUserForm.password} 
                   onChange={(e) => setNewUserForm({...newUserForm, password: e.target.value})} required 
                 />
               </div>
            </div>
          </div>

          <button className="w-full bg-blue-600 hover:bg-blue-500 text-white py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl shadow-blue-600/20 mt-6 active:scale-95" onClick={onSubmitNewUser} disabled={isLoading}>
            Dar de Alta
          </button>
        </div>
      </div>

      {/* Censo de Personal Table */}
      <div className="bg-white dark:bg-white/5 dark:border-white/10 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-black/20 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 flex items-center justify-center text-blue-500 shadow-sm">
              <UsersIcon size={20} />
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tighter text-slate-900 dark:text-white">Censo de Personal</h3>
              <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Colaboradores Activos en Planta</p>
            </div>
          </div>
          <span className="bg-emerald-500/10 text-emerald-500 text-[10px] font-black px-5 py-2 rounded-full uppercase tracking-widest border border-emerald-500/20">{users.length} Miembros</span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/30 dark:bg-transparent">
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-white/5">Colaborador / Avatar</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-white/5">Rol Operativo</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-white/5">Identificador</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-white/5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-white/5">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-slate-900 dark:bg-blue-600 flex items-center justify-center text-white font-black text-sm border-4 border-white dark:border-white/5 shadow-lg">
                        {u.fullName?.charAt(0)}
                      </div>
                      <p className="font-black text-slate-900 dark:text-white text-sm leading-tight">{u.fullName}</p>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${u.active === false ? 'bg-rose-500' : u.role === 'ADMINISTRADOR' ? 'bg-blue-500' : 'bg-slate-400'}`} />
                      <span className={`text-[10px] font-black uppercase tracking-widest ${u.active === false ? 'text-rose-500' : u.role === 'ADMINISTRADOR' ? 'text-blue-500' : 'text-slate-500 dark:text-slate-400'}`}>
                        {u.active === false ? 'SUSPENDIDO' : u.role}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <code className="text-[10px] font-black text-blue-600 dark:text-blue-400 bg-blue-600/10 px-4 py-1.5 rounded-xl border border-blue-600/10">#{u.document ?? u.username}</code>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openEdit(u)} className="p-3 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-all" title="Editar">
                        <Pencil size={18} />
                      </button>
                      <button onClick={() => onSuspendUser(u.id)} className="p-3 text-amber-500 hover:text-amber-700 hover:bg-amber-50 rounded-xl transition-all" title="Suspender">
                        <PauseCircle size={18} />
                      </button>
                      <button onClick={() => onDeleteUser(u.id)} className="p-3 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-all" title="Eliminar">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editingUser && (
        <div className="fixed inset-0 z-[120] bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-[2rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Editar usuario</p>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">{editingUser.fullName}</h3>
              </div>
              <button onClick={closeEdit} className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-500">
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input className="bg-slate-100 dark:bg-white/10 rounded-xl px-4 py-3 text-sm font-bold" placeholder="Documento ID" value={editForm.document} onChange={(e) => setEditForm((prev) => ({ ...prev, document: e.target.value }))} />
              <input className="bg-slate-100 dark:bg-white/10 rounded-xl px-4 py-3 text-sm font-bold" placeholder="Nombre completo" value={editForm.fullName} onChange={(e) => setEditForm((prev) => ({ ...prev, fullName: e.target.value }))} />
              <select className="bg-slate-100 dark:bg-white/10 rounded-xl px-4 py-3 text-sm font-bold" value={editForm.role} onChange={(e) => setEditForm((prev) => ({ ...prev, role: e.target.value as UserRole }))}>
                <option value="OPERADOR">OPERADOR</option>
                <option value="ADMINISTRADOR">ADMINISTRADOR</option>
                <option value="AUDITOR">AUDITOR</option>
              </select>
              <input className="bg-slate-100 dark:bg-white/10 rounded-xl px-4 py-3 text-sm font-bold" type="password" placeholder="Nueva contraseña (opcional)" value={editForm.password ?? ''} onChange={(e) => setEditForm((prev) => ({ ...prev, password: e.target.value }))} />
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={closeEdit} className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-600">Cancelar</button>
              <button onClick={() => void saveEdit()} disabled={isLoading || !canEdit} className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-3 text-xs font-black uppercase tracking-widest text-white disabled:opacity-60">
                Guardar cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
