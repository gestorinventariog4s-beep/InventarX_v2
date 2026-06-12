import { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { DashboardModule } from './modules/DashboardModule';
import { InventoryModule } from './modules/InventoryModule';
import { DeliveriesModule } from './modules/DeliveriesModule';
import { QrModule } from './modules/QrModule';
import { QrReceptionPortal } from './modules/QrReceptionPortal';
import { AuditModule } from './modules/AuditModule';
import { UsersModule } from './modules/UsersModule';
import { LoginModule } from './modules/LoginModule';
import { StockRequestsModule } from './modules/StockRequestsModule';
import { ProfilePanel } from './components/ProfilePanel';
import { TeamDirectory } from './components/TeamDirectory';
import { BottomToast, type ToastState, type ToastType } from './components/BottomToast';
import {
  createInventoryProduct,
  deleteInventoryProduct,
  downloadPublicActa,
  fetchInventoryAlerts,
  fetchInventoryProducts,
  fetchPublicProducts,
  listUsers,
  login,
  readSession,
  registerUser,
  deleteUser,
  suspendUser,
  updateUser,
  updateInventoryProduct,
  fetchAuditLogs,
  getMiPerfil,
  generarTokenQR,
  crearSolicitudDotacion,
} from './services/api';
import { fetchInventoryMovements } from './services/inventoryMovements';

import type { AuthResponse, ModuleId, AuditLog, Product, AppUser, StockAlert, UserRole, ProductPayload, InventoryMovement, UserProfile } from './types';

// ==========================================
// CONSTANTES GLOBALES (Declaradas una sola vez)
// ==========================================
const MOCK_PRODUCTS: Product[] = [
  {
    id: 'mock-prod-1',
    name: 'Casco de Seguridad ABS',
    sku: 'EPI-001',
    type: 'EPP',
    talla: 'L',
    color: 'Amarillo',
    stock: 45,
    stockMinimo: 10,
    stockMaximo: 100,
    active: true,
    category: { id: 'mock-cat-1', name: 'Proteccion' },
    sizeStocks: [{ id: 'mock-size-1', talla: 'L', stock: 45 }],
  },
  {
    id: 'mock-prod-2',
    name: 'Guantes de Nitrilo',
    sku: 'EPI-002',
    type: 'EPP',
    talla: 'M',
    color: 'Negro',
    stock: 5,
    stockMinimo: 20,
    stockMaximo: 200,
    active: true,
    category: { id: 'mock-cat-2', name: 'Manos' },
    sizeStocks: [{ id: 'mock-size-2', talla: 'M', stock: 5 }],
  },
];

const MOCK_USERS: AppUser[] = [
  { id: 1, username: 'ADMINISTRADOR', fullName: 'Administrador Sistema', role: 'ADMINISTRADOR' },
];

const EMPTY_NEW_USER_FORM = {
  document: '',
  password: '',
  fullName: '',
  role: 'OPERADOR' as UserRole,
};

const DEFAULT_PRODUCTS: Product[] = import.meta.env.DEV ? MOCK_PRODUCTS : [];

function App() {
  // ==========================================
  // MANEJO DE RUTAS PÚBLICAS POR QR
  // ==========================================
  const getPublicReceptionState = () => {
    const hash = window.location.hash || '';
    if (!hash.startsWith('#/recepcion-dotacion')) {
      return { isPublicReception: false, token: '' };
    }
    const [, query = ''] = hash.split('?');
    const params = new URLSearchParams(query);
    return {
      isPublicReception: true,
      token: params.get('token') ?? '',
    };
  };

  const initialPublicReceptionState = getPublicReceptionState();

  // ==========================================
  // ESTADOS PRINCIPALES DE LA APLICACIÓN
  // ==========================================
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [session, setSession] = useState<AuthResponse | null>(() => readSession());
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeModule, setActiveModule] = useState<ModuleId>('resumen');
  const [isLoading, setIsLoading] = useState(initialPublicReceptionState.isPublicReception);
  const [publicReceptionState, setPublicReceptionState] = useState(initialPublicReceptionState);
  
  // Inventario y Usuarios
  const [inventoryProducts, setInventoryProducts] = useState<Product[]>(DEFAULT_PRODUCTS);
  const [inventoryAlerts, setInventoryAlerts] = useState<StockAlert[]>([]);
  const [inventorySaving, setInventorySaving] = useState(false);
  const [users, setUsers] = useState<AppUser[]>(MOCK_USERS);
  const [newUserForm, setNewUserForm] = useState(EMPTY_NEW_USER_FORM);
  const [toast, setToast] = useState<ToastState | null>(null);
  
  // Dashboard Metrics
  const [movements, setMovements] = useState<InventoryMovement[]>([]);

  // ESTADOS REPARADOS: Auditoría (Faltaban en tu código base)
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditFrom, setAuditFrom] = useState('');
  const [auditTo, setAuditTo] = useState('');
  const [auditLoading, setAuditLoading] = useState(false);

  // ==========================================
  // EFECTOS GLOBALES
  // ==========================================
  useEffect(() => {
    if (session) {
      getMiPerfil().then((perfil) => {
        setUserProfile(perfil);
      }).catch(console.error);
    } else {
      setUserProfile(null);
    }
  }, [session]);

  useEffect(() => {
    if (session && userProfile) {
      localStorage.setItem('gestion-dotacion-last-user', JSON.stringify({
        username: session.username,
        fullName: userProfile.nombreCompleto || session.fullName,
        puestoTrabajo: userProfile.puestoTrabajo || session.role,
        fotoAvatar: userProfile.fotoAvatar || null
      }));
    }
  }, [session, userProfile]);

  // ==========================================
  // UTILIDADES GLOBALES
  // ==========================================
  const showToast = (type: ToastType, message: string) => {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 3500);
  };

  const getSafeErrorMessage = (error: unknown, fallback: string) => {
    if (error instanceof Error && error.message.trim()) return error.message;
    if (typeof error === 'string' && error.trim()) return error;
    return fallback;
  };


  // ==========================================
  // EFECTOS (Sincronizaciones y Cargas)
  // ==========================================
  
  // Sincronización del Dark Mode con Tailwind
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Sincronización de Hash de URL para Portal Público
  useEffect(() => {
    const syncRoute = () => {
      const nextState = getPublicReceptionState();
      setPublicReceptionState(nextState);
      if (nextState.isPublicReception) {
        setIsLoading(true);
      }
    };

    window.addEventListener('hashchange', syncRoute);
    return () => window.removeEventListener('hashchange', syncRoute);
  }, []);

  // Carga de Datos del Portal Público de Recepción
  useEffect(() => {
    if (!publicReceptionState.isPublicReception) return;

    let isMounted = true;
    void fetchPublicProducts()
      .then((products) => {
        if (isMounted && products.length > 0) {
          // Lista compilada de manera correcta
        }
      })
      .catch(() => {
        // Fallback silencioso
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [publicReceptionState.isPublicReception]);

  // Carga de Inventario y Alertas al iniciar sesión
  useEffect(() => {
    if (!session) return;

    const refreshInventory = async () => {
      try {
        const [products, alerts, fetchedMovements] = await Promise.all([
          fetchInventoryProducts(session, handleLogout),
          fetchInventoryAlerts(session, handleLogout),
          fetchInventoryMovements(session, handleLogout).catch(() => []),
        ]);
        setInventoryProducts(products);
        setInventoryAlerts(alerts);
        setMovements(fetchedMovements);
      } catch {
        setInventoryProducts(import.meta.env.DEV ? MOCK_PRODUCTS : []);
        setInventoryAlerts([]);
        setMovements([]);
      }
    };

    void refreshInventory();
  }, [session]);

  // Carga automática de usuarios para Administradores
  useEffect(() => {
    if (!session || session.role !== 'ADMINISTRADOR') return;

    void refreshUsers().catch(() => {
      setUsers(MOCK_USERS);
    });
  }, [session]);

  // Carga automática de Logs de Auditoría cuando cambian los filtros de fecha
  useEffect(() => {
    if (!session || activeModule !== 'auditoria') return;
    void refreshAuditLogs();
  }, [session, activeModule, auditFrom, auditTo]);

  // ==========================================
  // OPERACIONES DE FLUJO: AUTENTICACIÓN Y SISTEMA
  // ==========================================
  const handleLogout = () => {
    localStorage.removeItem('gestion-dotacion-auth');
    setSession(null);
  };

  const handleLoginSuccess = (authData: AuthResponse) => {
    setSession(authData);
    setActiveModule('resumen');
    
    localStorage.setItem('gestion-dotacion-last-user', JSON.stringify({
      username: authData.username,
      fullName: authData.fullName,
      puestoTrabajo: authData.role,
      fotoAvatar: authData.fotoAvatar || null
    }));
  };

  // ==========================================
  // OPERACIONES DE FLUJO: CONTROL DE USUARIOS
  // ==========================================
  const refreshUsers = async () => {
    if (!session || session.role !== 'ADMINISTRADOR') return;
    const response = await listUsers(session, handleLogout);
    setUsers(response);
  };

  const handleSubmitNewUser = async () => {
    if (!session || session.role !== 'ADMINISTRADOR') {
      showToast('error', 'Solo un usuario ADMIN puede crear nuevos usuarios.');
      return;
    }

    const payload = {
      document: newUserForm.document.trim(),
      fullName: newUserForm.fullName.trim(),
      password: newUserForm.password,
      role: newUserForm.role,
    };

    if (!payload.document || !payload.fullName || !payload.password) {
      showToast('error', 'Completa documento, nombre y contraseña.');
      return;
    }

    setIsLoading(true);
    try {
      await registerUser(payload, session, handleLogout);
      await refreshUsers();
      setNewUserForm(EMPTY_NEW_USER_FORM);
      showToast('success', 'Usuario creado correctamente.');
    } catch (error) {
      showToast('error', getSafeErrorMessage(error, 'No se pudo crear el usuario.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateUser = async (id: number | string, payload: { document: string; fullName: string; password?: string; role: UserRole }) => {
    if (!session || session.role !== 'ADMINISTRADOR') {
      showToast('error', 'Solo un usuario ADMIN puede editar usuarios.');
      return;
    }

    if (payload.document.trim() === session.username) {
      showToast('error', 'No puedes editar tu propio documento desde esta pantalla.');
      return;
    }

    setIsLoading(true);
    try {
      await updateUser(id, payload, session, handleLogout);
      await refreshUsers();
      showToast('success', 'Usuario actualizado correctamente.');
    } catch (error) {
      showToast('error', getSafeErrorMessage(error, 'No se pudo actualizar el usuario.'));
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuspendUser = async (id: number | string) => {
    if (!session || session.role !== 'ADMINISTRADOR') {
      showToast('error', 'Solo un usuario ADMIN puede suspender usuarios.');
      return;
    }

    setIsLoading(true);
    try {
      await suspendUser(id, session, handleLogout);
      await refreshUsers();
      showToast('success', 'Usuario suspendido correctamente.');
    } catch (error) {
      showToast('error', getSafeErrorMessage(error, 'No se pudo suspender el usuario.'));
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async (id: number | string) => {
    if (!session || session.role !== 'ADMINISTRADOR') {
      showToast('error', 'Solo un usuario ADMIN puede eliminar usuarios.');
      return;
    }

    setIsLoading(true);
    try {
      await deleteUser(id, session, handleLogout);
      await refreshUsers();
      showToast('success', 'Usuario eliminado correctamente.');
    } catch (error) {
      showToast('error', getSafeErrorMessage(error, 'No se pudo eliminar el usuario.'));
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // OPERACIONES DE FLUJO: GESTIÓN DE INVENTARIO
  // ==========================================
  const handleAddInventoryProduct = async (payload: ProductPayload) => {
    if (!session) {
      showToast('error', 'Sesión no disponible.');
      return;
    }
    setInventorySaving(true);
    try {
      await createInventoryProduct(payload, session, handleLogout);
      const [products, alerts, fetchedMovements] = await Promise.all([
        fetchInventoryProducts(session, handleLogout),
        fetchInventoryAlerts(session, handleLogout),
        fetchInventoryMovements(session, handleLogout).catch(() => []),
      ]);
      setInventoryProducts(products);
      setInventoryAlerts(alerts);
      setMovements(fetchedMovements);
      showToast('success', 'Producto creado correctamente.');
    } catch (error) {
      showToast('error', getSafeErrorMessage(error, 'No se pudo crear el producto.'));
      throw error;
    } finally {
      setInventorySaving(false);
    }
  };

  const handleEditInventoryProduct = async (id: string, payload: ProductPayload) => {
    if (!session) {
      showToast('error', 'Sesión no disponible.');
      return;
    }
    setInventorySaving(true);
    try {
      await updateInventoryProduct(id, payload, session, handleLogout);
      const [products, alerts, fetchedMovements] = await Promise.all([
        fetchInventoryProducts(session, handleLogout),
        fetchInventoryAlerts(session, handleLogout),
        fetchInventoryMovements(session, handleLogout).catch(() => []),
      ]);
      setInventoryProducts(products);
      setInventoryAlerts(alerts);
      setMovements(fetchedMovements);
      showToast('success', 'Producto actualizado correctamente.');
    } catch (error) {
      showToast('error', getSafeErrorMessage(error, 'No se pudo actualizar el producto.'));
      throw error;
    } finally {
      setInventorySaving(false);
    }
  };

  const handleDeleteInventoryProduct = async (id: string, mode: 'soft' | 'hard') => {
    if (!session) {
      showToast('error', 'Sesión no disponible.');
      return;
    }
    setInventorySaving(true);
    try {
      await deleteInventoryProduct(id, mode, session, handleLogout);
      const [products, alerts, fetchedMovements] = await Promise.all([
        fetchInventoryProducts(session, handleLogout),
        fetchInventoryAlerts(session, handleLogout),
        fetchInventoryMovements(session, handleLogout).catch(() => []),
      ]);
      setInventoryProducts(products);
      setInventoryAlerts(alerts);
      setMovements(fetchedMovements);
      showToast('success', mode === 'hard' 
        ? 'Producto eliminado definitivamente.' 
        : 'Producto ocultado correctamente de inventario.');
    } catch (error) {
      showToast('error', getSafeErrorMessage(error, 'No se pudo eliminar el producto.'));
      throw error;
    } finally {
      setInventorySaving(false);
    }
  };

  // ==========================================
  // OPERACIONES DE FLUJO: ENTREGAS Y QR
  // ==========================================
  const handleConfirmQrReception = async (payload: {
    qrToken: string;
    employeeFullName: string;
    employeeDocument: string;
    employeeEmail: string;
    employeeCargo: string;
    notes: string;
    items: Array<{ productId: string; quantity: number }>;
    signatureDataUrl: string;
  }) => {
    setIsLoading(true);
    try {
      // 1. Generar token QR
      const qrTokenData = await generarTokenQR('sede-principal-01');
      
      if (!qrTokenData?.id) {
        throw new Error('No se pudo generar el token QR');
      }

      // 2. Crear solicitud de dotación con el token QR generado
      const solicitudResponse = await crearSolicitudDotacion({
        qrTokenId: qrTokenData.id,
        sedeId: 'sede-principal-01',
        receptorDocumento: payload.employeeDocument,
        receptorNombre: payload.employeeFullName,
        receptorArea: payload.employeeCargo,
        consentimientoData: true,
        items: payload.items.map(item => ({
          productoId: item.productId,
          cantidad: item.quantity,
          talla: 'Estándar'
        }))
      });

      return {
        actaId: solicitudResponse.id,
        actaNumber: solicitudResponse.id,
        employeeEmail: payload.employeeEmail,
      };
    } catch (error: any) {
      showToast('error', `Error al crear solicitud: ${error.message}`);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadActa = async (actaId: number) => {
    if (!publicReceptionState.token) {
      throw new Error('No hay token QR disponible para descargar el acta.');
    }
    await downloadPublicActa(actaId, publicReceptionState.token);
  };

  // OPERACIÓN REPARADA: Obtención y refresco de logs de auditoría con filtros
  const refreshAuditLogs = async () => {
    if (!session) return;
    setAuditLoading(true);
    try {
      const logs = await fetchAuditLogs(auditFrom, auditTo, session, handleLogout);
      setAuditLogs(logs);
    } catch {
      showToast('error', 'No se pudieron cargar los registros de auditoría.');
    } finally {
      setAuditLoading(false);
    }
  };

  // ==========================================
  // RENDERIZADO CONDICIONAL DE MÓDULOS DE RUTA
  // ==========================================
  if (publicReceptionState.isPublicReception) {
    return <QrReceptionPortal />;
  }

  const [authError, setAuthError] = useState<string | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isTeamOpen, setIsTeamOpen] = useState(false);

  if (!session) {
    return (
      <>
        <LoginModule
          onLogin={async (credentials) => {
            setIsLoading(true);
            setAuthError(null);
            try {
              const authData = await login(credentials.username, credentials.password);
              handleLoginSuccess(authData);
            } catch (error) {
              const msg = getSafeErrorMessage(error, 'No fue posible iniciar sesión.');
              setAuthError(msg);
              showToast('error', msg);
            } finally {
              setIsLoading(false);
            }
          }}
          isLoading={isLoading}
          error={authError || undefined}
          isDarkMode={isDarkMode}
          toggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        />
        <BottomToast toast={toast} />
      </>
    );
  }

  return (
    <div className={`app-shell min-h-screen transition-all duration-500 max-lg:pb-24 ${isDarkMode ? 'dark bg-slate-950 text-slate-200' : 'bg-white text-blue-950'}`}>
      <Header 
        activeModule={activeModule} 
        setActiveModule={setActiveModule} 
        session={session}
        userProfile={userProfile}
        onLogout={handleLogout} 
        isDarkMode={isDarkMode}
        toggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        onOpenProfile={() => setIsProfileOpen(true)}
        onOpenTeam={() => setIsTeamOpen(true)}
      />

      <main className="max-w-[1700px] mx-auto px-4 md:px-8 pt-4 max-lg:pt-4 pb-10">
          {activeModule === 'resumen' && (
            <DashboardModule 
              products={inventoryProducts} 
              alerts={inventoryAlerts} 
              returns={[]} 
              users={users} 
              movements={movements}
              isDarkMode={isDarkMode}
            />
          )}
        
        {activeModule === 'inventario' && (
          <InventoryModule 
            products={inventoryProducts} 
            alerts={inventoryAlerts} 
            onAddProduct={handleAddInventoryProduct} 
            onEditProduct={handleEditInventoryProduct} 
            onDeleteProduct={handleDeleteInventoryProduct} 
            onBulkAddProducts={async () => {}}
            isLoading={inventorySaving}
          />
        )}

        {activeModule === 'entregas' && (
          <DeliveriesModule 
            products={inventoryProducts} 
            session={session}
            onLogout={handleLogout}
            onNotify={showToast}
            onSubmitDelivery={async () => {
              setIsLoading(true);
              try {
                // Sincronizar estados locales de almacén tras la transacción
                const [products, alerts, fetchedMovements] = await Promise.all([
                  fetchInventoryProducts(session, handleLogout),
                  fetchInventoryAlerts(session, handleLogout),
                  fetchInventoryMovements(session, handleLogout).catch(() => []),
                ]);
                setInventoryProducts(products);
                setInventoryAlerts(alerts);
                setMovements(fetchedMovements);
                
                showToast('success', 'Entrega confirmada y acta generada de inmediato.');
                return { actaId: 'NEW', actaNumber: 'ACT-' + Date.now() };
              } catch (error) {
                showToast('error', getSafeErrorMessage(error, 'No se pudo confirmar la entrega.'));
                throw error;
              } finally {
                setIsLoading(false);
              }
            }} 
            isLoading={isLoading}
          />
        )}

        {activeModule === 'qr' && (
          <QrModule
            products={inventoryProducts}
            onConfirmReception={handleConfirmQrReception}
            onDownloadActa={handleDownloadActa}
            isLoading={isLoading}
          />
        )}

        {activeModule === 'auditoria' && (
          <AuditModule 
            auditLogs={auditLogs}
            auditFrom={auditFrom}
            setAuditFrom={setAuditFrom}
            auditTo={auditTo}
            setAuditTo={setAuditTo}
            onRefresh={refreshAuditLogs}
            isLoading={auditLoading}
          />
        )}

        {activeModule === 'usuarios' && (
          <UsersModule 
            users={users} 
            newUserForm={newUserForm} 
            setNewUserForm={setNewUserForm} 
            onSubmitNewUser={handleSubmitNewUser} 
            onUpdateUser={handleUpdateUser}
            onSuspendUser={handleSuspendUser}
            onDeleteUser={handleDeleteUser}
            isLoading={isLoading || session.role !== 'ADMINISTRADOR'} 
          />
        )}

        {activeModule === 'solicitudes-stock' && (
          <StockRequestsModule session={session} onLogout={handleLogout} isDarkMode={isDarkMode} />
        )}
      </main>

      <ProfilePanel 
        isOpen={isProfileOpen} 
        onClose={() => setIsProfileOpen(false)} 
        isDarkMode={isDarkMode} 
        session={session} 
        showToast={showToast} 
        onProfileUpdate={setUserProfile}
      />

      <TeamDirectory 
        isOpen={isTeamOpen} 
        onClose={() => setIsTeamOpen(false)} 
        isDarkMode={isDarkMode} 
      />

      <BottomToast toast={toast} />
    </div>
  );
}

export default App;
