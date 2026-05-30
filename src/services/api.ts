// --- AUDITORÍA ---
import type { AuditLog } from '../types';

// Carga logs de auditoría entre dos fechas (ISO string)
export const fetchAuditLogs = async (
  from: string,
  to: string,
  session: AuthResponse | null,
  onLogout: () => void
): Promise<AuditLog[]> => {
  const res = await authFetch<any>(`/api/v1/auditoria/global?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, session, onLogout);
  return Array.isArray(res) ? res : (res.data || []);
};
import type { AppUser, AuthResponse, DeliveryResultResponse, Product, ProductPayload, StockAlert, UpdateUserPayload, UserRole, UserProfile, UpdatePerfilPayload } from '../types';

const STORAGE_KEY = 'gestion-dotacion-auth';
const API_BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const SIZE_STOCK_CACHE_KEY = 'gestion-dotacion-size-stocks-cache';

type CachedSizeStock = { talla: string; stock: number };
type CachedSizeStockStore = Record<string, CachedSizeStock[]>;

const normalizeSizeLabel = (size: string) => {
  const normalized = (size || '').trim().toUpperCase();
  if (normalized === 'METRO') return 'M';
  if (normalized === 'SG') return 'XL';
  return normalized;
};

const normalizeSizeStocks = (sizeStocks: Array<{ talla: string; stock: number }>) => {
  const grouped = new Map<string, number>();
  sizeStocks.forEach((item) => {
    const talla = normalizeSizeLabel(item.talla);
    grouped.set(talla, (grouped.get(talla) ?? 0) + (item.stock ?? 0));
  });
  return Array.from(grouped.entries()).map(([talla, stock]) => ({ talla, stock }));
};


const readSizeStockCache = (): CachedSizeStockStore => {
  try {
    const raw = localStorage.getItem(SIZE_STOCK_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as CachedSizeStockStore;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const writeSizeStockCache = (store: CachedSizeStockStore) => {
  try {
    localStorage.setItem(SIZE_STOCK_CACHE_KEY, JSON.stringify(store));
  } catch {
    // Ignore storage quota/security errors.
  }
};

const cacheSizeStocks = (productId: number | undefined, sku: string | undefined, sizeStocks: CachedSizeStock[]) => {
  if (!sizeStocks?.length) return;
  const normalized = normalizeSizeStocks(sizeStocks);
  const store = readSizeStockCache();
  if (productId != null) store[`id:${productId}`] = normalized;
  if (sku) store[`sku:${sku}`] = normalized;
  writeSizeStockCache(store);
};

const getCachedSizeStocks = (product: Product): CachedSizeStock[] => {
  const store = readSizeStockCache();
  const byId = product.id != null ? store[`id:${product.id}`] : undefined;
  if (byId?.length) return byId;
  const bySku = product.sku ? store[`sku:${product.sku}`] : undefined;
  return bySku?.length ? bySku : [];
};

const parseLegacySizeStocks = (product: Product) => {
  const rawTallas = (product.talla ?? '')
    .split(',')
    .map((item) => normalizeSizeLabel(item.trim()))
    .filter(Boolean);

  if (rawTallas.length === 0) return [];

  const uniqueTallas = Array.from(new Set(rawTallas));

  // Legacy APIs may not provide stock by size. Preserve sizes but do not invent quantities.
  return uniqueTallas.map((talla, idx) => ({
    id: -(product.id * 100 + idx + 1),
    talla,
    stock: 0,
  }));
};

const normalizeProduct = (rawProduct: any): Product => {
  const p = {
    id: rawProduct.id,
    sku: rawProduct.sku,
    name: rawProduct.nombre || rawProduct.name || '',
    type: rawProduct.tipo || rawProduct.type || 'General',
    color: rawProduct.color || '',
    talla: rawProduct.talla,
    photoUrl: rawProduct.photoUrl,
    stock: rawProduct.stockActual ?? rawProduct.stock ?? 0,
    stockMinimo: rawProduct.stockMinimo ?? 0,
    stockMaximo: rawProduct.stockMaximo ?? 100,
    active: rawProduct.activo ?? rawProduct.active ?? true,
    category: rawProduct.categoria ? { id: Date.now(), name: rawProduct.categoria, description: rawProduct.descripcion } : (rawProduct.category || { id: 0, name: 'General' }),
    sizeStocks: rawProduct.tallas || rawProduct.sizeStocks || []
  } as Product;

  const current = Array.isArray(p.sizeStocks) ? p.sizeStocks : [];
  if (current.length > 0) {
    const normalized = normalizeSizeStocks(current.map((s) => ({ talla: s.talla, stock: s.stock })));
    cacheSizeStocks(p.id, p.sku, normalized);
    p.sizeStocks = normalized.map((s, idx) => ({
      id: current[idx]?.id ?? -(p.id * 100 + idx + 1),
      talla: s.talla,
      stock: s.stock,
    }));
  } else {
    const cached = getCachedSizeStocks(p);
    if (cached.length > 0) {
      const normalizedCached = normalizeSizeStocks(cached);
      p.sizeStocks = normalizedCached.map((s, idx) => ({
        id: -(p.id * 100 + idx + 1),
        talla: s.talla,
        stock: s.stock,
      }));
    } else {
      p.sizeStocks = parseLegacySizeStocks(p);
    }
  }

  return p;
};

const normalizeProducts = (products: Product[]) => products.map(normalizeProduct);
const onlyActiveProducts = (products: Product[]) => products.filter((p) => p.active !== false);

export const readSession = (): AuthResponse | null => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AuthResponse;
    if (parsed.token && parsed.username && parsed.role) return parsed;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
  return null;
};

export const parseApiError = (errorPayload: unknown, fallback: string): string => {
  if (!errorPayload || typeof errorPayload !== 'object') return fallback;
  const message = (errorPayload as { message?: unknown }).message;
  return typeof message === 'string' && message.trim() ? message : fallback;
};

export const authFetch = async <T>(path: string, session: AuthResponse | null, onLogout: () => void, options?: globalThis.RequestInit): Promise<T> => {
  if (!session) throw new Error('Sesión no disponible.');

  const headers = new Headers(options?.headers);
  headers.set('Authorization', `Bearer ${session.token}`);
  if (!headers.has('Content-Type') && options?.body) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401 || response.status === 403) {
    onLogout();
    throw new Error('Sesión expirada o no autorizada. Ingresa nuevamente.');
  }

  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null);
    throw new Error(parseApiError(payload, 'No se pudo completar la solicitud.'));
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
};

export const downloadFile = async (path: string, filename: string, session: AuthResponse | null) => {
  if (!session) return;
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${session.token}` },
  });
  if (!response.ok) throw new Error('No se pudo descargar el archivo.');
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};

// Login estándar con usuario y contraseña
export const login = async (username: string, password: string): Promise<AuthResponse> => {
  const response = await fetch(`${API_BASE}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null);
    if (response.status === 401) throw new Error('Usuario o clave incorrecta.');
    throw new Error(parseApiError(payload, 'No se pudo iniciar sesión.'));
  }

  const data = (await response.json()) as AuthResponse;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  return data;
};

// WebAuthn Biometric Login Endpoints
export const getLoginChallenge = async (email: string) => {
  const response = await fetch(`${API_BASE}/api/v1/auth/biometric/login-challenge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null);
    throw new Error(parseApiError(payload, 'No se pudo iniciar biometría.'));
  }
  return response.json();
};

export const verifyLoginChallenge = async (email: string, credential: any): Promise<AuthResponse> => {
  const response = await fetch(`${API_BASE}/api/v1/auth/biometric/login-verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, credential }),
  });
  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null);
    throw new Error(parseApiError(payload, 'Verificación biométrica fallida.'));
  }
  const data = (await response.json()) as AuthResponse;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  return data;
};

export const publicFetch = async <T>(path: string, options?: globalThis.RequestInit): Promise<T> => {
  const headers = new Headers(options?.headers);
  if (!headers.has('Content-Type') && options?.body) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null);
    throw new Error(parseApiError(payload, 'No se pudo completar la solicitud.'));
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
};

export const fetchPublicProducts = async () => {
  const products = await publicFetch<Product[]>('/api/v1/public/products');
  return onlyActiveProducts(normalizeProducts(products));
};

export const fetchInventoryProducts = async (session: AuthResponse | null, onLogout: () => void) => {
  const products = await authFetch<Product[]>('/api/v1/inventario/productos', session, onLogout);
  return onlyActiveProducts(normalizeProducts(products));
};

export const fetchInventoryAlerts = (session: AuthResponse | null, onLogout: () => void) =>
  authFetch<StockAlert[]>('/api/v1/inventario/alertas', session, onLogout);

export const createInventoryProduct = async (
  payload: ProductPayload,
  session: AuthResponse | null,
  onLogout: () => void,
) => {
  const product = await authFetch<Product>('/api/v1/inventario/productos', session, onLogout, {
    method: 'POST',
    body: JSON.stringify({
      sku: payload.sku,
      nombre: payload.name,
      descripcion: payload.categoryDescription || '',
      categoria: payload.categoryName,
      tipo: payload.type,
      color: payload.color,
      tallas: payload.sizeStocks,
      stockMinimo: payload.stockMinimo,
      stockMaximo: payload.stockMaximo,
      stockActual: payload.sizeStocks.reduce((acc, curr) => acc + curr.stock, 0)
    }),
  });
  cacheSizeStocks(product.id, product.sku ?? payload.sku, payload.sizeStocks);
  return normalizeProduct(product);
};

export const updateInventoryProduct = async (
  id: number,
  payload: ProductPayload,
  session: AuthResponse | null,
  onLogout: () => void,
) => {
  const product = await authFetch<Product>(`/api/v1/inventario/productos/${id}`, session, onLogout, {
    method: 'PUT',
    body: JSON.stringify({
      sku: payload.sku,
      nombre: payload.name,
      descripcion: payload.categoryDescription || '',
      categoria: payload.categoryName,
      tipo: payload.type,
      color: payload.color,
      tallas: payload.sizeStocks,
      stockMinimo: payload.stockMinimo,
      stockMaximo: payload.stockMaximo,
      stockActual: payload.sizeStocks.reduce((acc, curr) => acc + curr.stock, 0)
    }),
  });
  cacheSizeStocks(product.id ?? id, product.sku ?? payload.sku, payload.sizeStocks);
  return normalizeProduct(product);
};

export const deleteInventoryProduct = (
  id: number,
  mode: 'soft' | 'hard',
  session: AuthResponse | null,
  onLogout: () => void,
) =>
  authFetch<void>(`/api/v1/inventario/productos/${id}?mode=${mode}`, session, onLogout, {
    method: 'DELETE',
  });

export const confirmPublicQrDelivery = (payload: {
  qrToken: string;
  employeeFullName: string;
  employeeDocument: string;
  employeeEmail: string;
  employeeCargo: string;
  notes: string;
  items: Array<{ productId: number; quantity: number }>;
  signatureDataUrl: string;
  evidencePhotos?: string[];
  giverSignatureDataUrl?: string;
  giverFullName?: string;
}) => {
  const transformedPayload = {
    sedeId: 'sede-principal-01',
    receptor: {
      documentoIdentidad: payload.employeeDocument,
      nombreCompleto: payload.employeeFullName,
      correo: payload.employeeEmail,
    },
    operadorId: payload.qrToken.includes('DIRECT-ADMIN') ? 'admin' : payload.qrToken,
    tipoEvidencia: 'FIRMA_DIGITAL',
    evidenciaBase64: payload.signatureDataUrl,
    inventarioItems: payload.items.map(item => ({
      productoId: item.productId.toString(),
      cantidad: item.quantity
    }))
  };

  return publicFetch<DeliveryResultResponse>('/api/v1/entregas/procesar', {
    method: 'POST',
    body: JSON.stringify(transformedPayload),
  });
};

// Delivery Session Endpoints
export interface DeliverySession {
  id: number;
  employeeDocument: string;
  status: 'CREATED' | 'EVIDENCE_READY' | 'SIGNED' | 'COMPLETED' | 'ABANDONED';
  itemsJson: string;
  photosJson: string;
  giverSignature: string;
  receiverSignature: string;
  giverFullName: string;
}

export const startDeliverySession = (document: string) => 
  publicFetch<DeliverySession>('/api/v1/public/delivery-sessions/start', {
    method: 'POST',
    body: JSON.stringify({ employeeDocument: document })
  });

export const iniciarEntregaAdmin = (id: string, adminId: string, session: AuthResponse | null, onLogout: () => void) => 
  authFetch<any>(`/api/v1/dotacion/solicitudes/${id}/iniciar`, session, onLogout, {
    method: 'PATCH',
    body: JSON.stringify({ adminId })
  });

export const getActiveDeliverySession = (document: string) => 
  publicFetch<any>(`/api/v1/dotacion/solicitudes/pendientes/${document}`).then(res => {
    if (!res) throw new Error("No session");
    // Adapter
    return {
      id: res.id,
      employeeDocument: res.receptorDocumento,
      status: (res.estado === 'PENDIENTE_DESPACHO' ? 'CREATED' :
              res.estado === 'EN_PROCESO' ? 'EVIDENCE_READY' :
              res.estado === 'ESPERANDO_RECEPTOR' ? 'SIGNED' :
              res.estado === 'ENTREGADO' ? 'COMPLETED' : 'ABANDONED') as "CREATED" | "EVIDENCE_READY" | "SIGNED" | "COMPLETED" | "ABANDONED",
      itemsJson: JSON.stringify((res.detalles || []).map((d: any) => ({
        productId: Number(d.productoId) || d.productoId,
        quantity: d.cantidad,
        talla: d.talla,
        name: d.producto?.nombre || `Ítem #${d.productoId}`
      }))),
      photosJson: '[]', // mock until we link it to the actual entity
      giverSignature: '', 
      giverFullName: res.admin?.nombreCompleto || 'Administrador',
      receiverSignature: res.evidencia || ''
    };
  });

export const updateSessionItemsAdmin = (id: string, items: any[], session: AuthResponse | null, onLogout: () => void) => 
  authFetch<any>(`/api/v1/dotacion/solicitudes/${id}/items`, session, onLogout, {
    method: 'PATCH',
    body: JSON.stringify({ items })
  });

export const updateSessionEvidence = async (id: number, data: { itemsJson: string, photosJson: string, giverSignature: string, giverFullName: string }) => {
  try {
    const sessionStr = localStorage.getItem('gestion-dotacion-auth');
    const session = sessionStr ? JSON.parse(sessionStr) : null;
    const items = JSON.parse(data.itemsJson);
    await authFetch<any>(`/api/v1/dotacion/solicitudes/${id}/items`, session, () => {}, {
      method: 'PATCH',
      body: JSON.stringify({ items })
    });
  } catch(e) {}
  return data as any;
};

export const employeeSignSession = (id: string, signature: string) => 
  publicFetch<any>(`/api/v1/dotacion/solicitudes/${id}/completar`, {
    method: 'POST',
    body: JSON.stringify({ evidencia: signature, tipoEvidencia: 'FIRMA_DIGITAL' })
  });

export const adminSignSession = (id: string, adminId: string, session: AuthResponse | null, onLogout: () => void) => 
  authFetch<any>(`/api/v1/dotacion/solicitudes/${id}/firma-admin`, session, onLogout, {
    method: 'POST',
    body: JSON.stringify({ adminId })
  });

export const completeDeliverySession = (id: number) => 
  publicFetch<DeliverySession>(`/api/public/delivery-sessions/${id}/complete`, {
    method: 'POST'
  });

export const getActaData = (actaId: number, token: string) => 
  publicFetch<any>(`/api/public/acta/${actaId}?token=${token}`);

export const downloadPublicActa = async (actaId: number, qrToken: string) => {
  const response = await fetch(`${API_BASE}/api/public/acta/${actaId}/pdf?token=${encodeURIComponent(qrToken)}`);
  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null);
    throw new Error(parseApiError(payload, 'No se pudo descargar el acta.'));
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `acta-${actaId}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};

export const getEmployee = (document: string) => 
  publicFetch<EmployeeProfile>(`/api/public/employees/${document}`);

export const saveEmployee = (profile: EmployeeProfile) => 
  publicFetch<EmployeeProfile>('/api/v1/public/employees', {
    method: 'POST',
    body: JSON.stringify(profile),
  });

export const getPendingDelivery = (document: string) => 
  publicFetch<any>(`/api/v1/dotacion/solicitudes/pendientes/${document}`);

export const crearSolicitudDotacion = (payload: {
  qrTokenId: string;
  sedeId: string;
  receptorDocumento: string;
  receptorNombre: string;
  receptorArea: string;
  consentimientoData: boolean;
  items?: Array<{ productoId: string; talla: string; cantidad: number }>;
}) => 
  publicFetch<any>('/api/v1/dotacion/solicitudes', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const savePendingDelivery = (document: string, items: Array<{ productId: number; quantity: number; talla: string }>) => 
  publicFetch<any>(`/api/public/employees/${document}/pending`, {
    method: 'POST',
    body: JSON.stringify(items),
  });

export const products = () =>
  publicFetch<any[]>('/api/v1/public/products');

export const createPendingDelivery = (payload: { employeeDocument: string; items: Array<{ productId: number; quantity: number }> }, session: AuthResponse | null, onLogout: () => void) => 
  authFetch<any>('/api/v1/deliveries/pending', session, onLogout, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const resendDeliveryEmail = (document: string, session: AuthResponse | null, onLogout: () => void) =>
  authFetch<void>(`/api/deliveries/resend-email/${document}`, session, onLogout, {
    method: 'POST',
  });

export const listUsers = (session: AuthResponse | null, onLogout: () => void) =>
  authFetch<AppUser[]>('/api/v1/usuarios', session, onLogout);

export const registerUser = (
  payload: { document: string; fullName: string; password: string; role: UserRole },
  session: AuthResponse | null,
  onLogout: () => void,
) =>
  authFetch<{ id: number; username: string; document: string; fullName: string; role: UserRole }>('/api/v1/auth/register', session, onLogout, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const updateUser = (
  id: string | number,
  payload: UpdateUserPayload,
  session: AuthResponse | null,
  onLogout: () => void,
) =>
  authFetch<AppUser>(`/api/v1/usuarios/${id}`, session, onLogout, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

export const suspendUser = (id: string | number, session: AuthResponse | null, onLogout: () => void) =>
  authFetch<AppUser>(`/api/v1/usuarios/${id}/suspender`, session, onLogout, {
    method: 'POST',
  });

export const deleteUser = (id: string | number, session: AuthResponse | null, onLogout: () => void) =>
  authFetch<void>(`/api/v1/usuarios/${id}`, session, onLogout, {
    method: 'DELETE',
  });

export interface EmployeeProfile {
  fullName: string;
  document: string;
  email: string;
  cargo: string;
}

export const getPendingEmployees = async (session: AuthResponse | null, onLogout: () => void) => {
  const requests = await authFetch<any[]>('/api/v1/dotacion/solicitudes/pendientes', session, onLogout);
  return requests.map(req => ({
    id: req.id,
    document: req.receptorDocumento,
    fullName: req.receptorNombre,
    cargo: req.receptorArea,
    email: req.correo || 'N/A',
    processState: req.estado,
    originalRequest: req
  }));
};

export const getAllEmployees = (session: AuthResponse | null, onLogout: () => void) =>
  authFetch<any[]>('/api/v1/employee/all', session, onLogout);

export const updateEmployeeState = (id: number, state: string, session: AuthResponse | null, onLogout: () => void) =>
  authFetch<any>(`/api/employee/${id}/state?state=${state}`, session, onLogout, {
    method: 'PUT'
  });

export const registerEmployeeAdmin = (payload: any, session: AuthResponse | null, onLogout: () => void) =>
  authFetch<any>('/api/v1/employee/register', session, onLogout, {
    method: 'POST',
    body: JSON.stringify(payload)
  });

// ==========================================
// PERFIL
// ==========================================

const profileLogout = () => {
  localStorage.removeItem('gestion-dotacion-auth');
  window.location.reload();
};

export const getMiPerfil = () => {
  const session = readSession();
  return authFetch<UserProfile>('/api/v1/perfiles/me', session, profileLogout);
};

export const updatePerfil = (data: UpdatePerfilPayload) => {
  const session = readSession();
  return authFetch<UserProfile>('/api/v1/perfiles/editar', session, profileLogout, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const updateEstado = (estado: 'DISPONIBLE' | 'EN_RUTA' | 'ALMUERZO' | 'AUSENTE') => {
  const session = readSession();
  return authFetch<UserProfile>('/api/v1/perfiles/estado', session, profileLogout, {
    method: 'PATCH',
    body: JSON.stringify({ estado: estado }), // Corregido: el backend espera 'estado'
  });
};

export const fetchEquipo = () => {
  const session = readSession();
  return authFetch<UserProfile[]>('/api/v1/perfiles/equipo', session, profileLogout);
};

export const uploadAvatar = (base64Image: string) => {
  const session = readSession();
  return authFetch<UserProfile>('/api/v1/perfiles/upload-avatar', session, profileLogout, {
    method: 'POST',
    body: JSON.stringify({ base64Image }),
  });
};

export const uploadPortada = (base64Image: string) => {
  const session = readSession();
  return authFetch<UserProfile>('/api/v1/perfiles/upload-portada', session, profileLogout, {
    method: 'POST',
    body: JSON.stringify({ base64Image }),
  });
};

export const fetchEntregas = (search?: string) => {
  const session = readSession();
  // TODO: Make sedeId configurable if needed, for now use default or empty
  const url = search ? `/api/v1/entregas?sedeId=sede-principal-01&search=${encodeURIComponent(search)}` : `/api/v1/entregas?sedeId=sede-principal-01`;
  return authFetch<{ message: string; data: import('../types').Entrega[] }>(url, session, profileLogout);
};
