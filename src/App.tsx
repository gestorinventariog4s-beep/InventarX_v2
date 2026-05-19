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
import { BottomToast, type ToastState, type ToastType } from './components/BottomToast';
import {
  confirmPublicQrDelivery,
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
} from './services/api';
import { 
  AuthResponse, 
  ModuleId, 
  Product, 
  ProductPayload,
  AppUser,
  StockAlert,
  UserRole,
} from './types';

// Mock Data
const MOCK_PRODUCTS: Product[] = [
  {
    id: 1,
    name: 'Casco de Seguridad ABS',
    sku: 'EPI-001',
    type: 'EPP',
    talla: 'L',
    color: 'Amarillo',
    stock: 45,
    stockMinimo: 10,
    stockMaximo: 100,
    active: true,
    category: { id: 1, name: 'Proteccion' },
    sizeStocks: [
      { id: 1, talla: 'L', stock: 45 },
    ],
  },
  {
    id: 2,
    name: 'Guantes de Nitrilo',
    sku: 'EPI-002',
    type: 'EPP',
    talla: 'M',
    color: 'Negro',
    stock: 5,
    stockMinimo: 20,
    stockMaximo: 200,
    active: true,
    category: { id: 2, name: 'Manos' },
    sizeStocks: [
      { id: 2, talla: 'M', stock: 5 },
    ],
  },
];

const MOCK_USERS: AppUser[] = [
  { id: 1, username: 'admin', fullName: 'Administrador Sistema', role: 'ADMIN' },
  { id: 2, username: 'op01', fullName: 'Juan Pérez', role: 'OPERADOR' },
];

const EMPTY_NEW_USER_FORM: { document: string; password: string; fullName: string; role: UserRole } = {
  document: '',
  password: '',
  fullName: '',
  role: 'OPERADOR',
};

const DEFAULT_PRODUCTS: Product[] = import.meta.env.DEV ? MOCK_PRODUCTS : [];

function App() {
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

  const [isDarkMode, setIsDarkMode] = useState(false);
  const [session, setSession] = useState<AuthResponse | null>(() => readSession());
  const [activeModule, setActiveModule] = useState<ModuleId>('resumen');
  const [isLoading, setIsLoading] = useState(initialPublicReceptionState.isPublicReception);
  const [publicReceptionState, setPublicReceptionState] = useState(initialPublicReceptionState);
  const [inventoryProducts, setInventoryProducts] = useState<Product[]>(DEFAULT_PRODUCTS);
  const [inventoryAlerts, setInventoryAlerts] = useState<StockAlert[]>([]);
  const [inventorySaving, setInventorySaving] = useState(false);
  const [users, setUsers] = useState<AppUser[]>(MOCK_USERS);
  const [newUserForm, setNewUserForm] = useState(EMPTY_NEW_USER_FORM);
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = (type: ToastType, message: string) => {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 3500);
  };

  const getSafeErrorMessage = (error: unknown, fallback: string) => {
    if (error instanceof Error && error.message.trim()) return error.message;
    if (typeof error === 'string' && error.trim()) return error;
    return fallback;
  };

  // Theme Sync
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

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

  useEffect(() => {
    if (!publicReceptionState.isPublicReception) {
      return;
    }

    let isMounted = true;
    void fetchPublicProducts()
      .then((products) => {
        if (isMounted && products.length > 0) {
          // Just verify product list compiles or can load
        }
      })
      .catch(() => {
        // Fallback silently
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

  const handleLogin = async (credentials: { username: string; password: string }) => {
    setIsLoading(true);
    try {
      const authenticatedSession = await login(credentials.username, credentials.password);
      setSession(authenticatedSession);
      showToast('success', 'Sesion iniciada correctamente.');
    } catch (error) {
      showToast('error', getSafeErrorMessage(error, 'No fue posible iniciar sesion.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('gestion-dotacion-auth');
    setSession(null);
  };

  const refreshUsers = async () => {
    if (!session || session.role !== 'ADMIN') return;
    const response = await listUsers(session, handleLogout);
    setUsers(response);
  };

  useEffect(() => {
    if (!session) {
      return;
    }

    const refreshInventory = async () => {
      try {
        const [products, alerts] = await Promise.all([
          fetchInventoryProducts(session, handleLogout),
          fetchInventoryAlerts(session, handleLogout),
        ]);
        setInventoryProducts(products);
        setInventoryAlerts(alerts);
      } catch {
        setInventoryProducts(import.meta.env.DEV ? MOCK_PRODUCTS : []);
        setInventoryAlerts([]);
      }
    };

    void refreshInventory();
  }, [session]);

  useEffect(() => {
    if (!session || session.role !== 'ADMIN') {
      return;
    }

    void refreshUsers()
      .catch(() => {
        setUsers(MOCK_USERS);
      });
  }, [session]);

  const handleSubmitNewUser = async () => {
    if (!session || session.role !== 'ADMIN') {
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
      showToast('error', 'Completa documento, nombre y contrasena.');
      return;
    }

    setIsLoading(true);
    try {
      await registerUser(payload, session, handleLogout);
      const refreshedUsers = await listUsers(session, handleLogout);
      setUsers(refreshedUsers);
      setNewUserForm(EMPTY_NEW_USER_FORM);
      showToast('success', 'Usuario creado correctamente.');
    } catch (error) {
      showToast('error', getSafeErrorMessage(error, 'No se pudo crear el usuario.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateUser = async (id: number, payload: { document: string; fullName: string; password?: string; role: UserRole }) => {
    if (!session || session.role !== 'ADMIN') {
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

  const handleSuspendUser = async (id: number) => {
    if (!session || session.role !== 'ADMIN') {
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

  const handleDeleteUser = async (id: number) => {
    if (!session || session.role !== 'ADMIN') {
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

  const handleAddInventoryProduct = async (payload: ProductPayload) => {
    if (!session) {
      showToast('error', 'Sesion no disponible.');
      return;
    }
    setInventorySaving(true);
    try {
      await createInventoryProduct(payload, session, handleLogout);
      const [products, alerts] = await Promise.all([
        fetchInventoryProducts(session, handleLogout),
        fetchInventoryAlerts(session, handleLogout),
      ]);
      setInventoryProducts(products);
      setInventoryAlerts(alerts);
      showToast('success', 'Producto creado correctamente.');
    } catch (error) {
      showToast('error', getSafeErrorMessage(error, 'No se pudo crear el producto.'));
      throw error;
    } finally {
      setInventorySaving(false);
    }
  };

  const handleEditInventoryProduct = async (id: number, payload: ProductPayload) => {
    if (!session) {
      showToast('error', 'Sesion no disponible.');
      return;
    }
    setInventorySaving(true);
    try {
      await updateInventoryProduct(id, payload, session, handleLogout);
      const [products, alerts] = await Promise.all([
        fetchInventoryProducts(session, handleLogout),
        fetchInventoryAlerts(session, handleLogout),
      ]);
      setInventoryProducts(products);
      setInventoryAlerts(alerts);
      showToast('success', 'Producto actualizado correctamente.');
    } catch (error) {
      showToast('error', getSafeErrorMessage(error, 'No se pudo actualizar el producto.'));
      throw error;
    } finally {
      setInventorySaving(false);
    }
  };

  const handleDeleteInventoryProduct = async (id: number, mode: 'soft' | 'hard') => {
    if (!session) {
      showToast('error', 'Sesion no disponible.');
      return;
    }
    setInventorySaving(true);
    try {
      await deleteInventoryProduct(id, mode, session, handleLogout);
      const [products, alerts] = await Promise.all([
        fetchInventoryProducts(session, handleLogout),
        fetchInventoryAlerts(session, handleLogout),
      ]);
      setInventoryProducts(products);
      setInventoryAlerts(alerts);
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

  const handleConfirmQrReception = async (payload: {
    qrToken: string;
    employeeFullName: string;
    employeeDocument: string;
    employeeEmail: string;
    employeeCargo: string;
    notes: string;
    items: Array<{ productId: number; quantity: number }>;
    signatureDataUrl: string;
  }) => {
    setIsLoading(true);
    try {
      const response = await confirmPublicQrDelivery(payload);
      return {
        actaId: response.actaId,
        actaNumber: response.actaNumber,
        employeeEmail: response.employeeEmail ?? payload.employeeEmail,
      };
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

  if (publicReceptionState.isPublicReception) {
    return (
      <QrReceptionPortal />
    );
  }

  if (!session) {
    return <LoginModule onLogin={handleLogin} isLoading={isLoading} isDarkMode={isDarkMode} toggleDarkMode={() => setIsDarkMode(!isDarkMode)} />;
  }

  return (
    <div className={`app-shell min-h-screen transition-all duration-500 ${isDarkMode ? 'dark bg-slate-950 text-slate-200' : 'bg-white text-blue-950'}`}>
      <Header 
        activeModule={activeModule} 
        setActiveModule={setActiveModule} 
        session={session} 
        onLogout={handleLogout} 
        isDarkMode={isDarkMode}
        toggleDarkMode={() => setIsDarkMode(!isDarkMode)}
      />

      <main className="max-w-[1700px] mx-auto px-4 md:px-8 pt-12">
        {activeModule === 'resumen' && (
          <DashboardModule 
            products={inventoryProducts} 
            alerts={inventoryAlerts} 
            returns={[]} 
            users={users} 
            demand={null} 
            realTimeData={[{ time: '10:00', value: 5 }, { time: '11:00', value: 12 }]}
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
            onSubmitDelivery={async (payload) => {
               setIsLoading(true);
               try {
                  const response = await confirmPublicQrDelivery({
                    qrToken: 'DIRECT-ADMIN-' + Date.now(),
                    employeeFullName: payload.employeeFullName,
                    employeeDocument: payload.employeeDocument,
                    employeeEmail: payload.employeeEmail,
                    employeeCargo: payload.employeeCargo,
                    notes: payload.notes,
                    items: payload.items,
                    signatureDataUrl: payload.signatureDataUrl,
                    giverSignatureDataUrl: payload.giverSignatureDataUrl,
                    giverFullName: payload.giverFullName,
                    evidencePhotos: payload.evidencePhotos
                  });
                  showToast('success', 'Entrega confirmada y acta generada.');
                  return response;
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
            auditLogs={[]} 
            auditFrom="" setAuditFrom={() => {}} 
            auditTo="" setAuditTo={() => {}} 
            onRefresh={async () => {}} 
            isLoading={false}
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
            isLoading={isLoading || session.role !== 'ADMIN'} 
          />
        )}
      </main>

      <BottomToast toast={toast} />
    </div>
  );
}

export default App;
